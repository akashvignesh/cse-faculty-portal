import type { Faculty } from "@/types/faculty";

export default function ResearchTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Research Area</h2>
      </div>
      <div className="faculty-chip-list">
        {faculty.researchTopics.length > 0 ? (
          faculty.researchTopics.map((topic) => (
            <span className="faculty-chip" key={topic}>
              {topic}
            </span>
          ))
        ) : (
          <div className="faculty-table-status" role="status">
            No research area data is available for this faculty record.
          </div>
        )}
      </div>
    </div>
  );
}
