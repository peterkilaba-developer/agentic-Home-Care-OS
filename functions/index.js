const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const DEFAULT_APP_ORIGIN = 'https://agentic-home-care-os.com';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new HttpsError('failed-precondition', `${name} is not configured.`);
  }
  return value;
}

function getStripe() {
  return require('stripe')(requiredEnv('STRIPE_SECRET_KEY'));
}

function getTwilio() {
  const accountSid = requiredEnv('TWILIO_ACCOUNT_SID');
  const authToken = requiredEnv('TWILIO_AUTH_TOKEN');
  return require('twilio')(accountSid, authToken);
}

function getMailTransporter() {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return null; // Email not configured — skip silently
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function getAppOrigin() {
  return (process.env.APP_ORIGIN || DEFAULT_APP_ORIGIN).replace(/\/+$/, '');
}

function appUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAppOrigin()}${normalizedPath}`;
}

function getAdminEmails() {
  if (!process.env.ADMIN_EMAILS) {
    console.warn('ADMIN_EMAILS env var is not set — no super-admin emails configured.');
    return [];
  }
  return process.env.ADMIN_EMAILS
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isSuperAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase();
  return Boolean(email && getAdminEmails().includes(email));
}

function requireAuth(auth, message = 'Authentication is required.') {
  if (!auth) {
    throw new HttpsError('unauthenticated', message);
  }
}

function safeHttpsError(error, fallbackMessage = 'Request failed.') {
  if (error instanceof HttpsError) return error;
  console.error("Internal Error:", error);
  
  // Provide more context for common Firebase Auth/Firestore errors while keeping it safe
  const message = error.message || fallbackMessage;
  if (error.code?.startsWith('auth/') || error.code?.startsWith('firestore/')) {
    return new HttpsError('internal', `${fallbackMessage} (${message})`);
  }
  
  return new HttpsError('internal', fallbackMessage);
}

async function assertHomeAdmin(auth, homeId) {
  requireAuth(auth, 'You must be logged in to manage staff.');
  if (!homeId) {
    throw new HttpsError('invalid-argument', 'homeId is required.');
  }

  const [homeSnap, userSnap] = await Promise.all([
    db.collection('homes').doc(homeId).get(),
    db.collection('users').doc(auth.uid).get(),
  ]);

  if (!homeSnap.exists) {
    throw new HttpsError('not-found', 'Home not found.');
  }

  const home = homeSnap.data();
  const user = userSnap.exists ? userSnap.data() : {};
  const ownsHome = home.ownerId === auth.uid || homeId === auth.uid;
  const businessAdmin = user.businessId && home.businessId === user.businessId && user.isAdmin === true;
  const homeAdmin = user.homeId === homeId && user.isAdmin === true;

  if (!isSuperAdmin(auth) && !ownsHome && !businessAdmin && !homeAdmin) {
    throw new HttpsError('permission-denied', 'You do not have permission to manage this home.');
  }

  return home;
}

// Export the Clinical Agent
exports.clinicalAgent = require('./clinical_agent').clinicalAgent;

// ---------------------------------------------------------
// PROVIDER ONBOARDING (validates input + creates docs server-side)
// ---------------------------------------------------------
exports.completeProviderOnboarding = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login required.');

  const {
    mode,
    businessName,
    businessEmail,
    businessPhone,
    careType,
    homeName,
    address,
    state,
    licenseNumber,
    capacity,
    staffCount,
    businessStatus,
    homePhoto,
    refId,
  } = data || {};

  if (mode !== 'new' && mode !== 'join') {
    throw new HttpsError('invalid-argument', 'mode must be "new" or "join".');
  }
  if (mode === 'new' && (typeof businessName !== 'string' || businessName.trim().length < 2)) {
    throw new HttpsError('invalid-argument', 'businessName required for new business.');
  }
  if (typeof careType !== 'string' || careType.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'careType required.');
  }
  if (typeof address !== 'string' || address.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'address required.');
  }
  if (typeof licenseNumber !== 'string' || licenseNumber.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'licenseNumber required.');
  }
  const safeCapacity = Number.isFinite(Number(capacity)) ? Math.max(0, Math.floor(Number(capacity))) : 0;
  const safeStaffCount = Number.isFinite(Number(staffCount)) ? Math.max(0, Math.floor(Number(staffCount))) : 0;
  const safeState = typeof state === 'string' && /^[a-z]{2}$/i.test(state) ? state.toLowerCase() : 'us';
  const safeStatus = businessStatus === 'Aspiring' ? 'Aspiring' : 'Operating';

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const userRef = db.collection('users').doc(auth.uid);
  const userSnap = await userRef.get();

  let businessId;
  if (mode === 'new') {
    businessId = `biz_${Math.random().toString(36).slice(2, 11)}`;
    await db.collection('businesses').doc(businessId).set({
      ownerUid: auth.uid,
      businessName: businessName.trim(),
      businessEmail: (businessEmail || auth.token?.email || '').trim() || null,
      businessPhone: (businessPhone || '').trim() || null,
      careType: careType.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    businessId = userSnap.exists ? userSnap.data().businessId : null;
    if (!businessId) {
      throw new HttpsError('failed-precondition', 'No existing business found for this user.');
    }
  }

  const homeId = `home_${Math.random().toString(36).slice(2, 11)}`;
  const isAgency = careType.includes('Agency');
  await db.collection('homes').doc(homeId).set({
    ownerId: auth.uid,
    businessId,
    homeName: (homeName || businessName || '').trim(),
    address: address.trim(),
    state: safeState,
    licenseNumber: licenseNumber.trim(),
    careType: careType.trim(),
    homePhoto: typeof homePhoto === 'string' ? homePhoto : null,
    capacity: isAgency || safeStatus === 'Aspiring' ? 0 : safeCapacity,
    staffCount: isAgency && safeStatus !== 'Aspiring' ? safeStaffCount : 0,
    subscriptionStatus: safeStatus === 'Aspiring' ? 'incubation' : 'trial',
    businessStatus: safeStatus,
    trialEndsAt: trialEndsAt.toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    refId: typeof refId === 'string' ? refId : null,
  });

  await userRef.set({
    role: 'provider',
    businessId,
    activeHomeId: homeId,
    isAdmin: true,
  }, { merge: true });

  console.log(`completeProviderOnboarding: created home ${homeId} for uid=${auth.uid}`);
  return { homeId, businessId };
});

// ---------------------------------------------------------
// 1. STRIPE CHECKOUT (AFH Onboarding)
// ---------------------------------------------------------
exports.createCheckoutSession = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to create a checkout session.');

  const { agencyName, address, licenseNumber, capacity, careType, refId } = data || {};
  if (!agencyName || !address) {
    throw new HttpsError('invalid-argument', 'Agency name and address are required.');
  }

  try {
    const stripe = getStripe();
    const foundersPriceId = requiredEnv('STRIPE_FOUNDERS_PRICE_ID');
    const staffPriceId = process.env.STRIPE_STAFF_PRICE_ID;

    const lineItems = [
      {
        price: foundersPriceId,
        quantity: 1,
      },
    ];

    // If it's a large facility, add the staff seat price as well
    // Note: In a real implementation, we'd use Stripe's per-unit pricing with usage or quantity
    if (careType === 'Assisted Living Facility > 10 Beds' && staffPriceId) {
      lineItems.push({
        price: staffPriceId,
        quantity: 1, // Start with 1 seat, or could be dynamic based on current staff count
      });
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: appUrl('/dashboard?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appUrl('/onboarding?type=provider'),
      client_reference_id: auth.uid,
      metadata: {
        agencyName,
        address,
        licenseNumber: licenseNumber || '',
        capacity: String(capacity || ''),
        careType: careType || '',
        refId: refId || '',
      },
    };

    if (refId) {
      try {
        const resellerDoc = await db.collection('resellers').doc(refId).get();
        if (resellerDoc.exists) {
          const resellerData = resellerDoc.data();
          if (resellerData.stripeAccountId) {
            sessionConfig.subscription_data = {
              transfer_data: {
                destination: resellerData.stripeAccountId,
                amount_percent: 50.0,
              },
            };
            console.log(`Attached 50% transfer_data for reseller: ${resellerData.stripeAccountId}`);
          } else {
            console.warn(`Reseller ${refId} is missing stripeAccountId. Routing 100% to platform treasury.`);
          }
        } else {
          console.warn(`Reseller ${refId} not found. Routing 100% to platform treasury.`);
        }
      } catch (err) {
        console.error('Error fetching reseller for transfer_data:', err);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return { url: session.url };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to create checkout session.');
  }
});

// ---------------------------------------------------------
// 2. STRIPE WEBHOOK (Handle Payment Success)
// ---------------------------------------------------------
exports.stripeWebhook = onRequest(async (req, res) => {
  let stripe;
  let endpointSecret;
  try {
    stripe = getStripe();
    endpointSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
  } catch (error) {
    console.error('Stripe webhook is not configured:', error.message);
    return res.status(500).send('Stripe webhook is not configured.');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing Stripe signature.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const uid = session.client_reference_id;
    const { agencyName, address, licenseNumber, capacity, careType, refId } = session.metadata || {};

    if (!uid) {
      console.error('Checkout session is missing client_reference_id.');
      return res.status(400).send('Missing user reference.');
    }

    try {
      await db.collection('homes').doc(uid).set({
        ownerId: uid,
        agencyName,
        homeName: agencyName,
        address,
        licenseNumber,
        capacity: Number.parseInt(capacity, 10) || null,
        careType: careType || 'Assisted Living Home < 10 Beds',
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        complianceStatus: 'Verified',
        refId: refId || null,
        referredBy: refId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (refId) {
        await db.collection('resellers').doc(refId).update({
          deployedSandboxes: admin.firestore.FieldValue.increment(1),
        });
      }

      console.log(`Successfully provisioned AFH: ${agencyName}`);
    } catch (error) {
      console.error('Error provisioning AFH:', error);
      return res.status(500).send('Database error.');
    }
  }

  return res.status(200).send('Webhook handled successfully.');
});

// ---------------------------------------------------------
// 3. STRIPE CONNECT (Affiliate Onboarding)
// ---------------------------------------------------------
exports.createConnectAccountLink = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to create a connect account link.');

  const { partnerName, address, brandName, payoutEmail, resellerType } = data || {};
  if (!partnerName || !payoutEmail) {
    throw new HttpsError('invalid-argument', 'Partner name and payout email are required.');
  }

  try {
    const stripe = getStripe();

    const parseAddress = (addr) => {
      if (!addr) return {};
      const parts = addr.split(',');
      if (parts.length < 3) return { line1: addr };
      const line1 = parts[0].trim();
      const city = parts[1].trim();
      const stateZip = parts[2] ? parts[2].trim().split(' ') : [];
      const state = stateZip[0] || '';
      const postalCode = stateZip[1] || '';
      return { line1, city, state, postal_code: postalCode, country: 'US' };
    };

    const businessType = resellerType?.toLowerCase().includes('business') || resellerType?.toLowerCase().includes('provider') ? 'company' : 'individual';
    const parsedAddr = parseAddress(address);
    const [firstName, ...lastNameParts] = partnerName.split(' ');

    const accountParams = {
      type: 'express',
      email: payoutEmail,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: businessType,
      business_profile: {
        url: getAppOrigin(),
        name: brandName || partnerName,
      },
    };

    if (businessType === 'individual') {
      accountParams.individual = {
        first_name: firstName,
        last_name: lastNameParts.join(' ') || 'Partner',
        address: parsedAddr,
      };
    } else {
      accountParams.company = {
        name: partnerName,
        address: parsedAddr,
      };
    }

    const account = await stripe.accounts.create(accountParams);

    await db.collection('resellers').doc(auth.uid).set({
      ownerId: auth.uid,
      partnerName,
      address,
      brandName: brandName || partnerName,
      payoutEmail,
      resellerType: resellerType || 'Unknown',
      stripeAccountId: account.id,
      stripeConnectStatus: 'Pending Verification',
      deployedSandboxes: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(auth.uid).set({
      role: 'reseller',
      isAdmin: true,
    }, { merge: true });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: appUrl('/onboarding?type=reseller&refresh=true'),
      return_url: appUrl('/reseller-portal'),
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to create Stripe Connect onboarding link.');
  }
});

// ---------------------------------------------------------
// 4. INTAKE DOCUMENT AI PARSER (Dashboard Pipeline)
// ---------------------------------------------------------
exports.parseIntakeDocument = onObjectFinalized({ region: 'us-east1' }, async (event) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType;

  if (!contentType || !contentType.includes('pdf')) {
    return console.log('This is not a PDF intake. Skipping.');
  }

  console.log(`Document AI triggered for new intake file: ${filePath}`);
  const patientId = filePath.split('/').pop().replace('.pdf', '');

  await db.collection('intake_pipeline').doc(patientId).set({
    status: 'drafting',
    aiStatus: 'Processing Document using Vertex AI...',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return null;
});

// ---------------------------------------------------------
// 5. AUTO-PROVISION STAFF ACCOUNTS (Invite Login)
// ---------------------------------------------------------
exports.provisionStaffAccount = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to provision a staff account.');

  const { email, phone, name, role, homeId } = data || {};
  if (!homeId || (!email && !phone)) {
    throw new HttpsError('invalid-argument', 'homeId and either email or phone are required for staff provisioning.');
  }


  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name || normalizedEmail).trim();
    const normalizedRole = String(role || 'caregiver').trim().toLowerCase();
    const staffRole = ['caregiver', 'med-tech', 'rn-delegator'].includes(normalizedRole) ? normalizedRole : 'caregiver';
    
    // Standardize phone to E.164 format for Firebase Auth and Twilio
    let formattedPhone = null;
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) formattedPhone = `+1${digits}`;
      else if (digits.length === 11 && digits.startsWith('1')) formattedPhone = `+${digits}`;
      else if (phone.startsWith('+')) formattedPhone = phone;
      else formattedPhone = `+${digits}`; // Fallback
    }

    const home = await assertHomeAdmin(auth, homeId);
    let uid;

    try {
      const userRecord = await admin.auth().createUser({
        email: normalizedEmail || undefined,
        phoneNumber: formattedPhone || undefined,
        displayName,
      });
      uid = userRecord.uid;
    } catch (createError) {
      if (createError.code === 'auth/email-already-exists') {
        const existingUser = await admin.auth().getUserByEmail(normalizedEmail);
        uid = existingUser.uid;
        await admin.auth().updateUser(uid, { displayName });
      } else if (createError.code === 'auth/phone-number-already-exists') {
        const existingUser = await admin.auth().getUserByPhoneNumber(formattedPhone);
        uid = existingUser.uid;
        await admin.auth().updateUser(uid, { displayName });
      } else {
        throw createError;
      }
    }

    await db.collection('users').doc(uid).set({
      homeId,
      businessId: home?.businessId || null,
      role: 'caregiver',
      staffRole,
      name: displayName,
      email: normalizedEmail || null,
      phone: phone || null,
      isAdmin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const staffMember = {
      uid,
      email: normalizedEmail || null,
      phone: phone || null,
      name: displayName,
      role: staffRole,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };

    const homeRef = db.collection('homes').doc(homeId);
    const homeSnap = await homeRef.get();
    const homeData = homeSnap.exists ? homeSnap.data() || {} : {};
    const nextStaffList = [
      ...(homeData.staffList || []).filter((staff) => String(staff.email || '').trim().toLowerCase() !== normalizedEmail && staff.uid !== uid),
      staffMember,
    ];

    await homeRef.set({
      staffList: nextStaffList,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // --- AUTOMATIC SMS INVITATION ---
    const inviteLink = appUrl(`/auth?join=caregiver&homeId=${homeId}&phone=${encodeURIComponent(formattedPhone || '')}&email=${encodeURIComponent(normalizedEmail || '')}`);

    if (formattedPhone) {
      try {
        const twilio = getTwilio();
        const fromNumber = requiredEnv('TWILIO_FROM_NUMBER');
        
        const messageBody = `Welcome to the team at ${home.homeName || 'the facility'}! 
Please use this link to securely verify your identity and join our Operational Compliance OS:
${inviteLink}`;

        console.log(`Attempting to send SMS (number redacted for privacy)...`);
        await twilio.messages.create({
          body: messageBody,
          from: fromNumber,
          to: formattedPhone,
        });
        console.log(`Successfully sent SMS invitation to ${formattedPhone}`);
      } catch (smsError) {
        console.error('Failed to send SMS invitation:', smsError);
        // We don't throw here to avoid failing the whole provisioning if SMS fails
      }
    }

    // --- AUTOMATIC EMAIL INVITATION (via Nodemailer) ---
    if (normalizedEmail) {
      try {
        const transporter = getMailTransporter();
        if (transporter) {
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #1a1a1a; background-color: #f8f9fa;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; border-radius: 12px 12px 0 0;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: white;">You're Invited!</h1>
                <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Operational Compliance OS</p>
              </div>
              <div style="padding: 32px; background: white; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hello <strong>${displayName}</strong>,<br/><br/>
                  You have been invited to join <strong>${home.homeName || 'the facility'}</strong> as a <strong style="color: #4f46e5;">${staffRole}</strong>.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteLink}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 16px 40px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">
                    Accept Invitation &amp; Join
                  </a>
                </div>
                <p style="font-size: 13px; color: #6b7280; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
                  If the button doesn't work, copy and paste this link:<br/>
                  <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
                </p>
              </div>
              <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 16px 0 0 0;">
                Sent by Agentic Home Care OS &bull; Do not reply to this email
              </p>
            </div>
          `;

          await transporter.sendMail({
            from: `"${home.homeName || 'Care Team'}" <${process.env.SMTP_USER}>`,
            to: normalizedEmail,
            subject: `Invitation to join ${home.homeName || 'the Care Team'}`,
            html: emailHtml,
          });
          console.log(`Successfully sent email invitation to ${normalizedEmail}`);
        } else {
          console.log('SMTP not configured — skipping email invitation. Set SMTP_USER and SMTP_PASS in .env to enable.');
        }
      } catch (emailError) {
        console.error('Failed to send email invitation:', emailError);
        // Don't throw — email failure should not block provisioning
      }
    }

    return { success: true, uid, staffMember };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to provision staff account.');
  }
});

// ---------------------------------------------------------
// 6. ACCEPT STAFF INVITES (Pending -> Active)
// ---------------------------------------------------------
exports.acceptStaffInvite = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to accept a staff invite.');

  const { homeId, email, phone } = data || {};
  if (!homeId) {
    throw new HttpsError('invalid-argument', 'homeId is required.');
  }

  try {
    let signedInEmail = auth.token?.email?.toLowerCase();
    if (!signedInEmail) {
      const userRecord = await admin.auth().getUser(auth.uid);
      signedInEmail = userRecord.email?.toLowerCase();
    }

    const inviteEmail = String(email || signedInEmail || '').trim().toLowerCase();

    console.log(`acceptStaffInvite: uid=${auth.uid} (PII redacted)`);

    const homeRef = db.collection('homes').doc(homeId);
    const homeSnap = await homeRef.get();
    if (!homeSnap.exists) {
      throw new HttpsError('not-found', 'Home not found.');
    }

    const homeData = homeSnap.data() || {};
    const staffList = homeData.staffList || [];
    
    // Match by UID, invite email, signed-in email, or phone
    const staffIndex = staffList.findIndex((staff) => {
      const staffEmail = String(staff.email || '').trim().toLowerCase();
      const staffPhone = String(staff.phone || '').replace(/\D/g, '');
      const searchPhone = String(phone || '').replace(/\D/g, '');
      
      return staff.uid === auth.uid || 
             (staffEmail && (staffEmail === inviteEmail || staffEmail === signedInEmail)) ||
             (searchPhone && staffPhone && staffPhone.endsWith(searchPhone.slice(-10)));
    });

    if (staffIndex === -1) {
      throw new HttpsError('permission-denied', 'No pending staff invite was found for this account.');
    }

    const nowIso = new Date().toISOString();
    const existingStaff = staffList[staffIndex] || {};
    const staffRole = existingStaff.role || existingStaff.staffRole || 'caregiver';
    const acceptedStaff = {
      ...existingStaff,
      uid: auth.uid,
      email: inviteEmail,
      name: existingStaff.name || auth.token?.name || inviteEmail,
      role: staffRole,
      status: 'onboarded',
      acceptedAt: existingStaff.acceptedAt || nowIso,
      lastLoginAt: nowIso,
    };

    const nextStaffList = [...staffList];
    nextStaffList[staffIndex] = acceptedStaff;

    await homeRef.set({
      staffList: nextStaffList,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(auth.uid).set({
      homeId,
      businessId: homeData.businessId || null,
      role: 'caregiver',
      staffRole,
      name: acceptedStaff.name,
      email: inviteEmail,
      isAdmin: false,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('system_logs').add({
      type: 'STAFF_ACCEPTED',
      message: `Caregiver invite accepted by ${acceptedStaff.name} (${inviteEmail}).`,
      homeId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, staffMember: acceptedStaff };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to accept staff invite.');
  }
});

// ---------------------------------------------------------
// 7. DEPROVISION STAFF ACCOUNTS (Clean Removal)
// ---------------------------------------------------------
exports.deprovisionStaffAccount = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to deprovision a staff account.');

  const { email, homeId } = data || {};
  if (!email || !homeId) {
    throw new HttpsError('invalid-argument', 'Email and homeId are required for staff deprovisioning.');
  }

  try {
    await assertHomeAdmin(auth, homeId);
    const normalizedEmail = String(email).trim().toLowerCase();
    let uid = null;

    console.log(`Deprovisioning staff: ${normalizedEmail} for home: ${homeId}`);

    try {
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      uid = userRecord.uid;
      const staffSnap = await db.collection('users').doc(uid).get();
      const staffData = staffSnap.exists ? staffSnap.data() : null;

      if (staffData?.homeId !== homeId && !isSuperAdmin(auth)) {
        throw new HttpsError('permission-denied', 'Cannot deprovision staff belonging to a different home.');
      }

      await admin.auth().deleteUser(uid);
      console.log(`Deleted Auth record for UID: ${uid}`);
      await db.collection('users').doc(uid).delete();
      console.log(`Deleted user document for UID: ${uid}`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`User not found in Auth for email: ${normalizedEmail}. Checking for orphan records in staffList.`);
      } else {
        throw authError;
      }
    }

    const homeRef = db.collection('homes').doc(homeId);
    const homeSnap = await homeRef.get();
    if (homeSnap.exists) {
      const homeData = homeSnap.data() || {};
      const currentStaffList = homeData.staffList || [];
      const nextStaffList = currentStaffList.filter((staff) => {
        const staffEmail = String(staff.email || '').trim().toLowerCase();
        const emailMatch = staffEmail === normalizedEmail;
        const uidMatch = uid && staff.uid === uid;
        return !emailMatch && !uidMatch;
      });

      if (nextStaffList.length < currentStaffList.length) {
        await homeRef.set({
          staffList: nextStaffList,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`Removed ${currentStaffList.length - nextStaffList.length} staff member(s) from homes/${homeId} staffList.`);
      } else {
        console.log(`No matching staff found in homes/${homeId} staffList for removal.`);
      }
    }

    return { success: true, email: normalizedEmail, uid };
  } catch (error) {
    console.error('Deprovisioning error:', error);
    throw safeHttpsError(error, 'Unable to deprovision staff account.');
  }
});

// ---------------------------------------------------------
// 8. AUTO-PROVISION FAMILY ACCOUNTS (Client Portal Invite)
// ---------------------------------------------------------
exports.provisionFamilyAccount = onCall(async (request) => {
  const { auth, data } = request;
  requireAuth(auth, 'You must be logged in to provision a family account.');

  const { email, name, residentId, residentName, homeId } = data || {};
  if (!homeId || !email || !residentId) {
    throw new HttpsError('invalid-argument', 'homeId, residentId, and email are required for family provisioning.');
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name || normalizedEmail).trim();
    
    // Ensure the inviter has permission for this home
    const home = await assertHomeAdmin(auth, homeId);
    let uid;

    // 1. Create or get Auth User
    try {
      const userRecord = await admin.auth().createUser({
        email: normalizedEmail || undefined,
        displayName,
      });
      uid = userRecord.uid;
    } catch (createError) {
      if (createError.code === 'auth/email-already-exists') {
        const existingUser = await admin.auth().getUserByEmail(normalizedEmail);
        uid = existingUser.uid;
        // Optionally update displayName
      } else {
        throw createError;
      }
    }

    // 2. Create the Users Document
    await db.collection('users').doc(uid).set({
      homeId,
      residentId,
      role: 'family',
      name: displayName,
      email: normalizedEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Create the family_invites Document
    await db.collection('family_invites').add({
      residentId,
      residentName: residentName || 'Resident',
      email: normalizedEmail,
      homeId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      documentsNeeded: ['Admission Agreement', 'HIPAA Release', 'Financial Responsibility']
    });

    // --- AUTOMATIC EMAIL INVITATION (via Nodemailer) ---
    // Note: Appending a query param for login page routing
    const inviteLink = appUrl(`/auth?join=family&homeId=${homeId}`);

    try {
      const transporter = getMailTransporter();
      if (transporter) {
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #1a1a1a; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: white;">Family Portal Access</h1>
              <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Operational Compliance OS</p>
            </div>
            <div style="padding: 32px; background: white; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello,<br/><br/>
                You have been invited to securely access the Family Portal for <strong>${residentName || 'your family member'}</strong> at <strong>${home.homeName || 'the facility'}</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 16px 40px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">
                  Access Family Portal
                </a>
              </div>
              <p style="font-size: 13px; color: #6b7280; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
              </p>
            </div>
            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 16px 0 0 0;">
              Sent by Agentic Home Care OS &bull; Do not reply to this email
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: `"${home.homeName || 'Care Team'}" <${process.env.SMTP_USER}>`,
          to: normalizedEmail,
          subject: `Secure Family Access for ${residentName || 'your family member'}`,
          html: emailHtml,
        });
        console.log(`Successfully sent email invitation to ${normalizedEmail}`);
      } else {
        console.log('SMTP not configured — skipping email invitation. Set SMTP_USER and SMTP_PASS in .env to enable.');
      }
    } catch (emailError) {
      console.error('Failed to send email invitation:', emailError);
    }

    return { success: true, uid, email: normalizedEmail };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to provision family account.');
  }
});

// ---------------------------------------------------------
// 9. ONBOARD FAMILY MEMBERS (Set status to Active)
// ---------------------------------------------------------
exports.acceptFamilyInvite = onCall(async (request) => {
  const { auth } = request;
  requireAuth(auth, 'You must be logged in to onboard.');

  try {
    const userSnap = await db.collection('users').doc(auth.uid).get();
    if (!userSnap.exists) return { success: false, message: 'User not found' };
    
    const user = userSnap.data();
    if (user.role !== 'family') return { success: false, message: 'Not a family account' };

    const email = auth.token.email?.toLowerCase();
    if (!email) return { success: false, message: 'No email found' };

    // Update all pending invites for this email to active
    const invitesQuery = await db.collection('family_invites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .get();

    const batch = db.batch();
    invitesQuery.forEach(doc => {
      batch.update(doc.ref, { status: 'active', onboardedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    await batch.commit();
    return { success: true, count: invitesQuery.size };
  } catch (error) {
    throw safeHttpsError(error, 'Unable to onboard family member.');
  }
});

// ---------------------------------------------------------
// 10. CHAT NOTIFICATIONS (Family -> Facility)
// ---------------------------------------------------------
exports.onChatMessageCreated = onDocumentCreated('messages/{messageId}', async (event) => {
  const message = event.data.data();
  if (!message || message.sender !== 'family') return;

  const { homeId, residentId, text, name } = message;
  
  try {
    const homeSnap = await db.collection('homes').doc(homeId).get();
    const homeData = homeSnap.exists ? homeSnap.data() : {};
    const adminEmail = homeData.email || homeData.adminEmail;

    // 1. Notify Facility Admin via Email
    const transporter = getMailTransporter();
    if (transporter && adminEmail) {
      await transporter.sendMail({
        from: `"Home Care OS" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `New Message from ${name} (Family)`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
            <h2 style="color: #2563eb; margin-top: 0;">New Family Message</h2>
            <p><strong>Resident:</strong> ${message.residentName || residentId}</p>
            <p><strong>From:</strong> ${name}</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              "${text}"
            </div>
            <a href="${appUrl('/dashboard/messages')}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reply in Dashboard</a>
          </div>
        `
      });
    }

    // 2. Identify active caregiver for this resident to notify them
    // (In a real app, this might be a push notification or SMS)
    const shiftQuery = await db.collection('shifts')
      .where('homeId', '==', homeId)
      .where('status', '==', 'active')
      .get();

    // If we have Twilio, we could send an SMS to the active caregiver(s)
    const twilio = process.env.TWILIO_ACCOUNT_SID ? getTwilio() : null;
    if (twilio) {
      for (const doc of shiftQuery.docs) {
        const shift = doc.data();
        if (shift.staffPhone) {
          await twilio.messages.create({
            body: `[Home Care OS] Family Message for ${message.residentName || 'Resident'}: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" - Reply in Caregiver Portal.`,
            from: process.env.TWILIO_FROM_NUMBER,
            to: shift.staffPhone
          });
        }
      }
    }

  } catch (error) {
    console.error('onChatMessageCreated error:', error);
  }
});
