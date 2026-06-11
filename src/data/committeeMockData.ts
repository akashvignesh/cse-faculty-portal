// type "role"      → first 5 columns, toggle X (holds this position)
// type "committee" → remaining columns, dropdown R / C / V / M
// category / servicePoints → static metadata shown in collapsible count rows
export const committeeList = [
  { id: 1, name: "Chair", type: "role", category: 6, servicePoints: 15 },
  { id: 2, name: "Associate Chair", type: "role", category: 5, servicePoints: 8 },
  { id: 3, name: "DGS, DGA, DUS", type: "role", category: 4, servicePoints: 5 },
  { id: 4, name: "Director of Research", type: "role", category: 4, servicePoints: 5 },
  { id: 5, name: "Center Director", type: "role", category: 4, servicePoints: 5 },
  { id: 6, name: "Tenure Track Faculty Search", type: "committee", category: 3, servicePoints: 3 },
  { id: 7, name: "Lecturer Search", type: "committee", category: 3, servicePoints: 3 },
  { id: 8, name: "GAC (+Grad Student Awards)", type: "committee", category: 3, servicePoints: 3 },
  { id: 9, name: "UGAC (+UG Student Awards)", type: "committee", category: 3, servicePoints: 3 },
  { id: 10, name: "Grad Admissions", type: "committee", category: 3, servicePoints: 3 },
  { id: 11, name: "Executive", type: "committee", category: 3, servicePoints: 3 },
  { id: 12, name: "Colloquium Upbeat", type: "committee", category: 2, servicePoints: 2 },
  {
    id: 13,
    name: "Student Engagement and Experiential Learning",
    type: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 14, name: "Strategic Planning", type: "committee", category: 3, servicePoints: 3 },
  {
    id: 15,
    name: "Faculty Evaluation and Award",
    type: "committee",
    category: 3,
    servicePoints: 3,
  },
  {
    id: 16,
    name: "Teaching Effectiveness & TA training",
    type: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 17, name: "Grievance", type: "committee", category: 2, servicePoints: 2 },
  { id: 18, name: "Internships", type: "committee", category: 2, servicePoints: 2 },
  { id: 19, name: "Distinguished Speakers", type: "committee", category: 2, servicePoints: 2 },
  { id: 20, name: "Cooperation and Promotion", type: "committee", category: 2, servicePoints: 2 },
  { id: 21, name: "UG Program Assessment", type: "committee", category: 2, servicePoints: 2 },
  { id: 22, name: "Grad Program Assessment", type: "committee", category: 2, servicePoints: 2 },
  { id: 23, name: "Broadening Participation", type: "committee", category: 2, servicePoints: 2 },
  {
    id: 24,
    name: "Alumni and Community Outreach",
    type: "committee",
    category: 2,
    servicePoints: 2,
  },
  {
    id: 25,
    name: "Community Education Outreach (CSExplor)",
    type: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 26, name: "Documentation Governance", type: "committee", category: 1, servicePoints: 1 },
  { id: 27, name: "Hospitality", type: "committee", category: 1, servicePoints: 1 },
  {
    id: 28,
    name: "Student Effectiveness Task Force",
    type: "committee",
    category: 1,
    servicePoints: 1,
  },
  { id: 29, name: "CE Focus Task Force", type: "committee", category: 1, servicePoints: 1 },
  { id: 30, name: "ABET Preparation Task Force", type: "committee", category: 2, servicePoints: 2 },
  { id: 31, name: "SEAS Tenure Committee", type: "committee", category: 3, servicePoints: 3 },
  { id: 32, name: "SEAS Promotion Committee", type: "committee", category: 3, servicePoints: 3 },
  {
    id: 33,
    name: "SEAS Faculty Awards Committee",
    type: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 34, name: "SEAS Grievance Pool", type: "committee", category: 2, servicePoints: 2 },
  { id: 35, name: "UB Grievance Pool", type: "committee", category: 2, servicePoints: 2 },
  {
    id: 36,
    name: "SEAS Qualified Rank Promotion",
    type: "committee",
    category: 3,
    servicePoints: 3,
  },
];

// role columns  → value "X" (holds this position)
// committee cols → "R" = Role, "C" = Chair, "V" = Vice Chair, "M" = Member
export const committeeMembershipData = [
  // role assignments (first 5 cols)
  { committeeId: 1, userid: "jsmith", role: "X" }, // jsmith is Chair
  { committeeId: 2, userid: "roshana", role: "X" }, // roshana is Associate Chair
  // committee assignments
  { committeeId: 10, userid: "jsmith", role: "M" },
  { committeeId: 8, userid: "abrown", role: "M" },
  { committeeId: 6, userid: "rlee", role: "M" },
  { committeeId: 11, userid: "roshana", role: "C" },
  { committeeId: 12, userid: "roshana", role: "M" },
  { committeeId: 13, userid: "roshana", role: "C" },
  { committeeId: 14, userid: "roshana", role: "M" },
  { committeeId: 19, userid: "roshana", role: "M" },
];
