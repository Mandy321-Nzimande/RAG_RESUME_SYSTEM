import { parseRecruiterQuery } from "./QueryParser";

describe("parseRecruiterQuery", () => {
  it("extracts a strict experience cutoff", () => {
    expect(parseRecruiterQuery("less than one year experience, familiar with Python")).toEqual({
      hard_constraints: { experience_years: { $lt: 1 } },
      semantic_query: "familiar with Python",
      has_hard_constraints: true
    });
  });

  it("does not treat vague experience as a hard constraint", () => {
    expect(parseRecruiterQuery("some experience with Python")).toEqual({
      hard_constraints: {},
      semantic_query: "some experience with Python",
      has_hard_constraints: false
    });
  });

  it("extracts strict degree and location requirements", () => {
    const result = parseRecruiterQuery("must have a bachelor's degree and must be located in Johannesburg, Python developer");
    expect(result.hard_constraints).toEqual({
      location: { $eq: "Johannesburg" },
      education: { $regex: "bachelor's degree" }
    });
    expect(result.semantic_query).toBe("Python developer");
  });
});