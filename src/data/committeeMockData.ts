// kind "leadership" → first 5 columns, toggle X (holds this position)
// other kinds       → dropdown R / C / V / M
//   "committee"/"taskforce" = department service (counted in "# of Committees")
//   "seas"/"pool"           = external service   (counted in "# of Others")
// category / servicePoints follow the 2026 CSE Service workbook's Category and
// Service Points rows (Committees-F25 rows 5–6): 6=15, 5=8, 4=5, 3=3, 2=2, 1=1.
export const committeeList = [
  { id: 1, name: "Chair", kind: "leadership", category: 6, servicePoints: 15 },
  { id: 2, name: "Associate Chair", kind: "leadership", category: 5, servicePoints: 8 },
  { id: 3, name: "DGS, DGA, DUS", kind: "leadership", category: 4, servicePoints: 5 },
  { id: 4, name: "Director of Research", kind: "leadership", category: 4, servicePoints: 5 },
  { id: 5, name: "Center Director", kind: "leadership", category: 4, servicePoints: 5 },
  { id: 6, name: "Tenure Track Faculty Search", kind: "committee", category: 3, servicePoints: 3 },
  { id: 7, name: "Lecturer Search", kind: "committee", category: 3, servicePoints: 3 },
  { id: 8, name: "GAC (+Grad Student Awards)", kind: "committee", category: 3, servicePoints: 3 },
  { id: 9, name: "UGAC (+UG Student Awards)", kind: "committee", category: 3, servicePoints: 3 },
  { id: 10, name: "Grad Admissions", kind: "committee", category: 3, servicePoints: 3 },
  { id: 11, name: "Executive", kind: "committee", category: 3, servicePoints: 3 },
  { id: 12, name: "Colloquium Upbeat", kind: "committee", category: 2, servicePoints: 2 },
  {
    id: 13,
    name: "Student Engagement and Experiential Learning",
    kind: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 14, name: "Strategic Planning", kind: "committee", category: 2, servicePoints: 2 },
  {
    id: 15,
    name: "Faculty Evaluation and Award",
    kind: "committee",
    category: 2,
    servicePoints: 2,
  },
  {
    id: 16,
    name: "Teaching Effectiveness & TA training",
    kind: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 17, name: "Grievance", kind: "committee", category: 2, servicePoints: 2 },
  { id: 18, name: "Internships", kind: "committee", category: 2, servicePoints: 2 },
  { id: 19, name: "Distinguished Speakers", kind: "committee", category: 2, servicePoints: 2 },
  { id: 20, name: "Cooperation and Promotion", kind: "committee", category: 2, servicePoints: 2 },
  { id: 21, name: "UG Program Assessment", kind: "committee", category: 2, servicePoints: 2 },
  { id: 22, name: "Grad Program Assessment", kind: "committee", category: 2, servicePoints: 2 },
  { id: 23, name: "Broadening Participation", kind: "committee", category: 2, servicePoints: 2 },
  {
    id: 24,
    name: "Alumni and Community Outreach",
    kind: "committee",
    category: 2,
    servicePoints: 2,
  },
  {
    id: 25,
    name: "Community Education Outreach (CSExplor)",
    kind: "committee",
    category: 2,
    servicePoints: 2,
  },
  { id: 26, name: "Documentation Governance", kind: "committee", category: 2, servicePoints: 2 },
  { id: 27, name: "Hospitality", kind: "committee", category: 2, servicePoints: 2 },
  {
    id: 28,
    name: "Student Effectiveness Task Force",
    kind: "taskforce",
    category: 3,
    servicePoints: 3,
  },
  { id: 29, name: "CE Focus Task Force", kind: "taskforce", category: 2, servicePoints: 2 },
  { id: 30, name: "ABET Preparation Task Force", kind: "taskforce", category: 2, servicePoints: 2 },
  { id: 31, name: "SEAS Tenure Committee", kind: "seas", category: 1, servicePoints: 1 },
  { id: 32, name: "SEAS Promotion Committee", kind: "seas", category: 1, servicePoints: 1 },
  { id: 33, name: "SEAS Faculty Awards Committee", kind: "seas", category: 1, servicePoints: 1 },
  { id: 34, name: "SEAS Grievance Pool", kind: "pool", category: 1, servicePoints: 1 },
  { id: 35, name: "UB Grievance Pool", kind: "pool", category: 1, servicePoints: 1 },
  { id: 36, name: "SEAS Qualified Rank Promotion", kind: "seas", category: 1, servicePoints: 1 },
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
