const fs = require('fs');

function refactorFile(file, replacements) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(file, code);
  console.log(`Updated ${file}`);
}

refactorFile('src/pages/ClientPortal.jsx', [
  [/const \[patient, setPatient\]/g, 'const [resident, setResident]'],
  [/setPatient\(/g, 'setResident('],
  [/patient\.name/g, 'resident.name'],
  [/patient\.room/g, 'resident.room'],
  [/patient=\{patient\}/g, 'resident={resident}'],
  [/function DailyOverview\(\{ patient \}\)/g, 'function DailyOverview({ resident })'],
  [/function ActivityTimeline\(\{ patient \}\)/g, 'function ActivityTimeline({ resident })'],
  [/function CarePlanViewer\(\{ patient \}\)/g, 'function CarePlanViewer({ resident })'],
  [/function DocumentVault\(\{ patient \}\)/g, 'function DocumentVault({ resident })'],
  [/function MessageFacility\(\{ patient \}\)/g, 'function MessageFacility({ resident })'],
  [/function BillingCenter\(\{ patient \}\)/g, 'function BillingCenter({ resident })'],
  [/alt="Patient"/g, 'alt="Resident"'],
]);

refactorFile('src/pages/CaregiverPortal.jsx', [
  [/const \[activePatientId, setActivePatientId\]/g, 'const [activeResidentId, setActiveResidentId]'],
  [/activePatientId/g, 'activeResidentId'],
  [/setActivePatientId/g, 'setActiveResidentId'],
  [/activePatient/g, 'activeResident'],
  [/patients\.find/g, 'residents.find'],
  [/patients\.map/g, 'residents.map'],
  [/patients={patients}/g, 'residents={residents}'],
  [/patients\[/g, 'residents['],
  [/patients\.length/g, 'residents.length'],
  [/\{patients\}/g, '{residents}'],
  [/patientId:/g, 'residentId:'],
  [/patientId/g, 'residentId'],
  [/patientName:/g, 'residentName:'],
  [/checkedMedsByPatient/g, 'checkedMedsByResident'],
  [/activeTasksByPatient/g, 'activeTasksByResident'],
  [/Unknown Patient/g, 'Unknown Resident'],
  [/Patient:/g, 'Resident:'],
  [/function ShiftRoster\(\{ residents, activeResidentId, setActiveResidentId \}\)/g, 'function ShiftRoster({ residents, activeResidentId, setActiveResidentId })'],
  [/function MedicationRecord\(\{ residents, activeShiftId, checkedMedsByResident, homeId, staffProfile, distance, activeResidentId, setActiveResidentId \}\)/g, 'function MedicationRecord({ residents, activeShiftId, checkedMedsByResident, homeId, staffProfile, distance, activeResidentId, setActiveResidentId })'],
  [/function DailyChores\(\{ residents, activeShiftId, activeTasksByResident, homeId, staffProfile, distance, activeResidentId, setActiveResidentId \}\)/g, 'function DailyChores({ residents, activeShiftId, activeTasksByResident, homeId, staffProfile, distance, activeResidentId, setActiveResidentId })'],
]);

refactorFile('src/components/caregiver/VoiceCharting.jsx', [
  [/activePatientId/g, 'activeResidentId'],
  [/setActivePatientId/g, 'setActiveResidentId'],
  [/activePatient/g, 'activeResident'],
  [/patients\.find/g, 'residents.find'],
  [/patients\[/g, 'residents['],
  [/patients/g, 'residents'],
  [/patientId:/g, 'residentId:'],
  [/patientId/g, 'residentId'],
  [/patientName:/g, 'residentName:'],
]);

refactorFile('src/components/caregiver/HandoverDashboard.jsx', [
  [/function HandoverDashboard\(\{ patient \}\)/g, 'function HandoverDashboard({ resident })'],
  [/patient\.id/g, 'resident.id'],
  [/patient\.name/g, 'resident.name'],
  [/patient\?\./g, 'resident?.'],
  [/'patientId'/g, "'residentId'"],
]);

