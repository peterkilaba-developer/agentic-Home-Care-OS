import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Mail, Phone, MapPin, Globe, Share2 } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-24 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-24 mb-24">
          {/* Brand Column */}
          <div className="space-y-8">
            <Link to="/marketing" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-sans font-bold tracking-tight text-white">Operational Compliance</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] -mt-1">Agentic OS</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              The world's first AI-guided operational foundation for home care providers. 
              Built to automate compliance and elevate care standards.
            </p>
            <div className="flex items-center gap-4">
              {[Activity, ShieldCheck].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">Product</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/platform" className="hover:text-primary transition-colors">Platform Overview</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing & Plans</Link></li>
              <li><Link to="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link></li>
              <li><Link to="/state/wa" className="hover:text-primary transition-colors">State Regulations</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">Compliance</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/legal" className="hover:text-primary transition-colors">Audit Readiness</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">HIPAA Compliance</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">Contact</h4>
            <ul className="space-y-6 text-sm">
              <li className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>123 Compliance Way,<br />Seattle, WA 98101</span>
              </li>
              <li className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+1 (888) 555-0123</span>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>ops@agentic-home-care-os.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} Agentic Home Care OS. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>SOC2 Certified</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
