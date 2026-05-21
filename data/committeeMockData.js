// type "role"      → first 5 columns, toggle X (holds this position)
// type "committee" → remaining columns, dropdown R / C / V / M
export const committeeList = [
  { id: 1,  name: "Chair",                                      type: "role"      },
  { id: 2,  name: "Associate Chair",                            type: "role"      },
  { id: 3,  name: "DGS, DGA, DUS",                              type: "role"      },
  { id: 4,  name: "Director of Research",                       type: "role"      },
  { id: 5,  name: "Center Director",                            type: "role"      },
  { id: 6,  name: "Tenure Track Faculty Search",                type: "committee" },
  { id: 7,  name: "Lecturer Search",                            type: "committee" },
  { id: 8,  name: "GAC (+Grad Student Awards)",                 type: "committee" },
  { id: 9,  name: "UGAC (+UG Student Awards)",                  type: "committee" },
  { id: 10, name: "Grad Admissions",                            type: "committee" },
  { id: 11, name: "Executive",                                  type: "committee" },
  { id: 12, name: "Colloquium Upbeat",                          type: "committee" },
  { id: 13, name: "Student Engagement and Experiential Learning", type: "committee" },
  { id: 14, name: "Strategic Planning",                         type: "committee" },
  { id: 15, name: "Faculty Evaluation and Award",               type: "committee" },
  { id: 16, name: "Teaching Effectiveness & TA training",       type: "committee" },
  { id: 17, name: "Grievance",                                  type: "committee" },
  { id: 18, name: "Internships",                                type: "committee" },
  { id: 19, name: "Distinguished Speakers",                     type: "committee" },
  { id: 20, name: "Cooperation and Promotion",                  type: "committee" },
  { id: 21, name: "UG Program Assessment",                      type: "committee" },
  { id: 22, name: "Grad Program Assessment",                    type: "committee" },
  { id: 23, name: "Broadening Participation",                   type: "committee" },
  { id: 24, name: "Alumni and Community Outreach",              type: "committee" },
  { id: 25, name: "Community Education Outreach (CSExplor)",    type: "committee" },
  { id: 26, name: "Documentation Governance",                   type: "committee" },
  { id: 27, name: "Hospitality",                                type: "committee" },
  { id: 28, name: "Student Effectiveness Task Force",           type: "committee" },
  { id: 29, name: "CE Focus Task Force",                        type: "committee" },
  { id: 30, name: "ABET Preparation Task Force",                type: "committee" },
  { id: 31, name: "SEAS Tenure Committee",                      type: "committee" },
  { id: 32, name: "SEAS Promotion Committee",                   type: "committee" },
  { id: 33, name: "SEAS Faculty Awards Committee",              type: "committee" },
  { id: 34, name: "SEAS Grievance Pool",                        type: "committee" },
  { id: 35, name: "UB Grievance Pool",                          type: "committee" },
  { id: 36, name: "SEAS Qualified Rank Promotion",              type: "committee" },
];

// role columns  → value "X" (holds this position)
// committee cols → "R" = Role, "C" = Chair, "V" = Vice Chair, "M" = Member
export const committeeMembershipData = [
  // role assignments (first 5 cols)
  { committeeId: 1,  userid: "jsmith",  role: "X" },   // jsmith is Chair
  { committeeId: 2,  userid: "roshana", role: "X" },   // roshana is Associate Chair
  // committee assignments
  { committeeId: 10, userid: "jsmith",  role: "M" },
  { committeeId: 8,  userid: "abrown",  role: "M" },
  { committeeId: 6,  userid: "rlee",    role: "M" },
  { committeeId: 11, userid: "roshana", role: "C" },
  { committeeId: 12, userid: "roshana", role: "M" },
  { committeeId: 13, userid: "roshana", role: "C" },
  { committeeId: 14, userid: "roshana", role: "M" },
  { committeeId: 19, userid: "roshana", role: "M" },
];
