const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Variable / Prop renames
code = code.replace(/patients={patients}/g, 'residents={residents}');
code = code.replace(/const \[patients, setPatients\]/g, 'const [residents, setResidents]');
code = code.replace(/setPatients\(/g, 'setResidents(');
code = code.replace(/patients\.length/g, 'residents.length');
code = code.replace(/patients\.map/g, 'residents.map');
code = code.replace(/patients \= \[\]/g, 'residents = []');
code = code.replace(/function HomeOverview\(\{(.*)patients(.*)\}\)/g, 'function HomeOverview({$1residents$2})');
code = code.replace(/function PatientRosterView\(\{(.*)patients(.*)\}\)/g, 'function ResidentRosterView({$1residents$2})');
code = code.replace(/<PatientRosterView/g, '<ResidentRosterView');
code = code.replace(/qPatients/g, 'qResidents');
code = code.replace(/unsubPatients/g, 'unsubResidents');

// UI text renames
code = code.replace(/Patient Roster/g, 'Resident Roster');
code = code.replace(/Total Patients/g, 'Total Residents');
code = code.replace(/Patient Name/g, 'Resident Name');
code = code.replace(/Unknown Patient/g, 'Unknown Resident');
code = code.replace(/when patients are admitted/g, 'when residents are admitted');
code = code.replace(/Extract patient details/g, 'Extract resident details');
code = code.replace(/\[AI\] Extracted Patient/g, '[AI] Extracted Resident');
code = code.replace(/Patient: \{selectedLead/g, 'Resident: {selectedLead');
code = code.replace(/PATIENT: \$\{selectedLead/g, 'RESIDENT: ${selectedLead');
code = code.replace(/patient name/g, 'resident name');

fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Updated Dashboard.jsx');
