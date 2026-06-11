export const facultyMockData = [
  {
    name: "John Smith",
    userid: "jsmith",
    officeAddress: "Davis Hall 101",
    personNumber: "10000001",
    titleLine: "Associate Professor of Computer Science and Engineering",
    statusMessage: "jsmith doing business as jsmith in role faculty",
    primaryEmail: "jsmith@buffalo.edu",
    secondaryEmail: "john.smith@research.buffalo.edu",
    physicalAddressLines: ["Davis Hall 101", "Buffalo, NY 14260-2500 USA"],
    mailingAddressLines: ["338 Davis Hall", "Buffalo, NY 14260-2500 USA"],
    socialLinks: ["scholar.google.com/citations?user=jsmith", "linkedin.com/in/john-smith-cse"],
    pronouns: "He/Him/His",
    primaryAppointment: "Associate Professor",
    researchTopics: ["Distributed systems", "Cloud infrastructure", "Systems security"],
    leaves: [
      {
        leaveId: "L-1001",
        leaveType: "Sabbatical",
        startDate: "2026-08-20",
        endDate: "2027-01-15",
        reason: "Industry collaboration and research leave",
      },
    ],
    committees: [
      {
        committeeId: "C-1001",
        committeeName: "Graduate Admissions",
        role: "Chair",
        termCode: "2026FA",
      },
    ],
    awards: [
      {
        awardId: "A-1001",
        awardName: "SEAS Research Excellence Award",
        awardYear: "2025",
        organization: "University at Buffalo",
      },
    ],
    students: [
      {
        studentId: "S-1001",
        studentName: "Maya Chen",
        userid: "mchen8",
        program: "PhD",
      },
      {
        studentId: "S-1002",
        studentName: "Rafael Gomez",
        userid: "rgomez3",
        program: "PhD",
      },
    ],
    standardLoad: "2-1",
    nextPromotionDate: "2027-08-15",
    backupFacultyPersonNumber: "10000002",
    profilePhotoDocumentId: "DOC-3001",
    cvDocumentId: "DOC-4001",
    createdAt: "2024-01-10 09:15:00",
    updatedAt: "2026-04-10 14:20:00",
    coursePreferences: [
      {
        teachingPreferenceId: "TP-1001",
        termCode: "2026SP",
        courseCode: "CSE521",
        preferredCourseName: "Introduction to Operating Systems",
        priority: 1,
      },
      {
        teachingPreferenceId: "TP-1002",
        termCode: "2026SP",
        courseCode: "CSE573",
        preferredCourseName: "Computer Vision and Image Processing",
        priority: 2,
      },
    ],
    teachingHistory: {
      success: true,
      message: "Teaching history fetched successfully",
      data: {
        faculty: "John Smith",
        facultySourceKey: "10000001",
        years: [
          {
            year: 2025,
            spring: [
              {
                classNumber: "16860",
                courseName: "799TUT-Supervised Research",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
            summer: [],
            fall: [
              {
                classNumber: "74800",
                courseName: "700TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
          },
          {
            year: 2024,
            spring: [
              {
                classNumber: "12311",
                courseName:
                  "111LLB-Introduction to Quantitative Analysis and Reasoning with Computing",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
              {
                classNumber: "15202",
                courseName: "700TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
            summer: [],
            fall: [
              {
                classNumber: "13840",
                courseName: "501LEC-Introduction to Graduate Study in Computer Science I",
                courseType: "Lecture",
                courseCareer: "Graduate",
              },
            ],
          },
        ],
      },
    },
  },
  {
    name: "Alice Brown",
    userid: "abrown",
    officeAddress: "Bell Hall 220",
    personNumber: "10000002",
    titleLine: "Teaching Professor of Computer Science and Engineering",
    statusMessage: "abrown doing business as abrown in role faculty",
    primaryEmail: "abrown@buffalo.edu",
    secondaryEmail: "alice.brown@buffalo.edu",
    physicalAddressLines: ["Bell Hall 220", "Buffalo, NY 14260-2500 USA"],
    mailingAddressLines: ["220 Bell Hall", "Buffalo, NY 14260-2500 USA"],
    socialLinks: ["cse.buffalo.edu/~abrown"],
    pronouns: "She/Her/Hers",
    primaryAppointment: "Teaching Professor",
    researchTopics: ["Computing education", "Curriculum design"],
    leaves: [
      {
        leaveId: "L-2001",
        leaveType: "Course Release",
        startDate: "2026-01-12",
        endDate: "2026-05-10",
        reason: "Curriculum redesign",
      },
    ],
    committees: [
      {
        committeeId: "C-2001",
        committeeName: "Undergraduate Curriculum",
        role: "Member",
        termCode: "2026SP",
      },
    ],
    awards: [
      {
        awardId: "A-2001",
        awardName: "Teaching Innovation Award",
        awardYear: "2024",
        organization: "School of Engineering and Applied Sciences",
      },
    ],
    students: [
      {
        studentId: "S-2001",
        studentName: "Nina Patel",
        userid: "npatel7",
        program: "MS",
      },
    ],
    standardLoad: "1-1",
    nextPromotionDate: "2028-01-05",
    backupFacultyPersonNumber: "10000003",
    profilePhotoDocumentId: "DOC-3002",
    cvDocumentId: "DOC-4002",
    createdAt: "2023-09-22 11:40:00",
    updatedAt: "2026-03-18 10:05:00",
    coursePreferences: [
      {
        teachingPreferenceId: "TP-2001",
        termCode: "2026FA",
        courseCode: "CSE331",
        preferredCourseName: "Algorithms and Complexity",
        priority: 1,
      },
      {
        teachingPreferenceId: "TP-2002",
        termCode: "2026FA",
        courseCode: "CSE431",
        preferredCourseName: "Database Systems",
        priority: 2,
      },
    ],
  },
  {
    name: "Robert Lee",
    userid: "rlee",
    officeAddress: "Furnas Hall 310",
    personNumber: "10000003",
    titleLine: "Assistant Professor of Computer Science and Engineering",
    statusMessage: "rlee doing business as rlee in role faculty",
    primaryEmail: "rlee@buffalo.edu",
    secondaryEmail: "robert.lee@cse.buffalo.edu",
    physicalAddressLines: ["Furnas Hall 310", "Buffalo, NY 14260-2500 USA"],
    mailingAddressLines: ["310 Furnas Hall", "Buffalo, NY 14260-2500 USA"],
    socialLinks: ["github.com/rlee-cse", "scholar.google.com/citations?user=rlee"],
    pronouns: "He/Him/His",
    primaryAppointment: "Assistant Professor",
    researchTopics: ["Machine learning", "Computer vision", "Responsible AI"],
    leaves: [],
    committees: [
      {
        committeeId: "C-3001",
        committeeName: "Faculty Search",
        role: "Member",
        termCode: "2026FA",
      },
    ],
    awards: [
      {
        awardId: "A-3001",
        awardName: "Early Career Research Grant",
        awardYear: "2026",
        organization: "NSF",
      },
    ],
    students: [
      {
        studentId: "S-3001",
        studentName: "Haruto Sato",
        userid: "hsato2",
        program: "PhD",
      },
    ],
    standardLoad: "2-2",
    nextPromotionDate: "2026-11-01",
    backupFacultyPersonNumber: "",
    profilePhotoDocumentId: "DOC-3003",
    cvDocumentId: "DOC-4003",
    createdAt: "2022-06-14 08:00:00",
    updatedAt: "2026-02-27 16:45:00",
    coursePreferences: [
      {
        teachingPreferenceId: "TP-3001",
        termCode: "2026SP",
        courseCode: "CSE474",
        preferredCourseName: "Introduction to Machine Learning",
        priority: 1,
      },
    ],
  },
  {
    name: "Roshan Ayyalasomayajula",
    userid: "roshana",
    officeAddress: "113I Davis Hall",
    personNumber: "10000001",
    titleLine: "Assistant Professor",
    statusMessage: "roshana doing business as roshana in role faculty",
    primaryEmail: "roshana@buffalo.edu",
    secondaryEmail: "",
    physicalAddressLines: ["113I Davis Hall", "Buffalo, NY 14260-2500 USA"],
    mailingAddressLines: ["113I Davis Hall", "Buffalo, NY 14260-2500 USA"],
    socialLinks: [],
    pronouns: "",
    primaryAppointment: "Assistant",
    researchTopics: [
      "Artificial Intelligence, Machine Learning and Data Mining",
      "Databases and Data Science",
      "Natural Language Processing",
    ],
    leaves: [
      {
        leaveId: "L-4002",
        leaveType: "Sabbatical",
        startDate: "2024-08-26",
        endDate: "2025-05-16",
        reason: "Research and academic development.",
        location: "Buffalo, NY",
        backupFacultyPersonNumber: "10000013",
      },
    ],
    committees: [
      {
        committeeId: "C-4001",
        committeeName: "CSE Colloquium + UpBeat",
        role: "Member",
        termCode: "2026FA",
      },
      {
        committeeId: "C-4002",
        committeeName: "CSE Strategic Planning",
        role: "Co-Chair",
        termCode: "2026FA",
      },
      {
        committeeId: "C-4003",
        committeeName: "CSE Student Engagement and Experiential Learning",
        role: "Chair",
        termCode: "2026FA",
      },
      {
        committeeId: "C-4004",
        committeeName: "CSE Distinguished Speaker",
        role: "Member",
        termCode: "2026FA",
      },
      {
        committeeId: "C-4005",
        committeeName: "CSE Executive",
        role: "Co-Chair",
        termCode: "2026FA",
      },
    ],
    awards: [],
    students: [
      {
        studentPersonNumber: "20000001",
        fullName: "Alice Nguyen",
        program: "PhD in Computer Science and Engineering",
      },
      {
        studentPersonNumber: "20000007",
        fullName: "Arjun Menon",
        program: "PhD in Computer Science and Engineering",
      },
      {
        studentPersonNumber: "20000009",
        fullName: "Kevin Brown",
        program: "PhD in Computer Science and Engineering",
      },
      {
        studentPersonNumber: "20000010",
        fullName: "Maya Singh",
        program: "MS in Computer Science and Engineering",
      },
      {
        studentPersonNumber: "20000006",
        fullName: "Nina Thomas",
        program: "MS in Computer Science and Engineering",
      },
      {
        studentPersonNumber: "20000008",
        fullName: "Sophia Lee",
        program: "MS in Computer Science and Engineering",
      },
    ],
    standardLoad: "",
    nextPromotionDate: "",
    backupFacultyPersonNumber: "10000013",
    profilePhotoDocumentId: "",
    cvDocumentId: "",
    profilePhotoUrl: "/api/v1/faculty/10000001/profile-photo",
    createdAt: "2026-03-25 00:00:00",
    updatedAt: "2026-03-25 00:00:00",
    teachingPreferences: [
      {
        courseId: "002193",
        courseName: "667LEC-Advanced Topics in Computational Linguistics",
        coursePref: "qualified",
      },
      {
        courseId: "004559",
        courseName: "321LR-Real -Time and Embedded Operating Systems",
        coursePref: "preference3",
      },
      {
        courseId: "004872",
        courseName: "475LLR-Modern Computer Systems",
        coursePref: "not qualified",
      },
      {
        courseId: "004876",
        courseName: "490LAB-Computer Architecture",
        coursePref: "preference2",
      },
      {
        courseId: "007518",
        courseName: "202LEC-Circuit Analysis 1",
        coursePref: "preference1",
      },
      {
        courseId: "010218",
        courseName: "695LAB-Adv High Volt/Pow Electrc",
        coursePref: "preference2",
      },
    ],
    teachingHistory: {
      success: true,
      message: "Teaching history fetched successfully",
      data: {
        faculty: "Roshan Ayyalasomayajula",
        facultySourceKey: "10000001",
        years: [
          {
            year: 2026,
            spring: [
              {
                classNumber: "23101",
                courseName: "474LEC-Introduction to Machine Learning",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
              {
                classNumber: "23102",
                courseName: "574LEC-Introduction to Machine Learning",
                courseType: "Lecture",
                courseCareer: "Graduate",
              },
            ],
            summer: [],
            fall: [
              {
                classNumber: "24871",
                courseName: "667LEC-Advanced Topics in Computational Linguistics",
                courseType: "Lecture",
                courseCareer: "Graduate",
              },
            ],
          },
          {
            year: 2025,
            spring: [
              {
                classNumber: "20518",
                courseName: "475LLR-Modern Computer Systems",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
            ],
            summer: [
              {
                classNumber: "11830",
                courseName: "700TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
            fall: [
              {
                classNumber: "24312",
                courseName: "574LEC-Introduction to Machine Learning",
                courseType: "Lecture",
                courseCareer: "Graduate",
              },
              {
                classNumber: "24313",
                courseName: "499TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Undergraduate",
              },
            ],
          },
          {
            year: 2024,
            spring: [
              {
                classNumber: "19840",
                courseName: "667LEC-Advanced Topics in Computational Linguistics",
                courseType: "Lecture",
                courseCareer: "Graduate",
              },
              {
                classNumber: "19841",
                courseName: "700TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
            summer: [],
            fall: [
              {
                classNumber: "22104",
                courseName: "474LEC-Introduction to Machine Learning",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
            ],
          },
          {
            year: 2023,
            spring: [
              {
                classNumber: "18370",
                courseName: "695LAB-Advanced High Voltage and Power Electronics",
                courseType: "Lab",
                courseCareer: "Graduate",
              },
            ],
            summer: [
              {
                classNumber: "11220",
                courseName: "799TUT-Supervised Research",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
            fall: [
              {
                classNumber: "21282",
                courseName: "321LR-Real-Time and Embedded Operating Systems",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
              {
                classNumber: "21283",
                courseName: "700TUT-Independent Study",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
          },
          {
            year: 2022,
            spring: [
              {
                classNumber: "17624",
                courseName: "490LAB-Computer Architecture",
                courseType: "Lab",
                courseCareer: "Undergraduate",
              },
            ],
            summer: [],
            fall: [
              {
                classNumber: "20449",
                courseName: "202LEC-Circuit Analysis 1",
                courseType: "Lecture",
                courseCareer: "Undergraduate",
              },
              {
                classNumber: "20450",
                courseName: "598TUT-Internship",
                courseType: "Tutorial",
                courseCareer: "Graduate",
              },
            ],
          },
        ],
      },
    },
    teachingReductions: [
      {
        teachingReductionId: "TR-1001",
        termCode: "2027SP",
        reductionType: "Special Assignment",
        reductionAmount: 0.25,
        reason:
          "Special assignment related to accreditation preparation and departmental reporting.",
        approvalDocumentId: "",
        createdAt: "2026-03-25",
      },
      {
        teachingReductionId: "TR-1002",
        termCode: "2026SP",
        reductionType: "Research Release",
        reductionAmount: 0.5,
        reason:
          "Research release granted for major proposal development and manuscript preparation.",
        approvalDocumentId: "",
        createdAt: "2026-03-25",
      },
      {
        teachingReductionId: "TR-1003",
        termCode: "2026FA",
        reductionType: "Administrative",
        reductionAmount: 0.25,
        reason: "Administrative support provided for curriculum planning and faculty coordination.",
        approvalDocumentId: "",
        createdAt: "2026-03-25",
      },
      {
        teachingReductionId: "TR-1004",
        termCode: "2025FA",
        reductionType: "Course Buyout",
        reductionAmount: 0.5,
        reason: "Externally funded research grant supported a one-course buyout for Fall 2025.",
        approvalDocumentId: "",
        createdAt: "2026-03-25",
      },
    ],
  },
];
