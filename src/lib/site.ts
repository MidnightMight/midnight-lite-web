import site from "../data/site.json";
export { site };

export const TOPICS: Record<string, string> = {
  "3d-printing": "3D printing", robots: "Robots", photography: "Photography", electric: "Electric",
  web: "Web & software", "site-updates": "Site updates",
};
export const STATUS: Record<string, [string, string]> = {
  "in-progress": ["In progress", "wip"], done: ["Done", "done"], live: ["Live", "done"], "coming-soon": ["Coming soon", "soon"],
};
export const fmtDate = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
export const readMins = (body = "") => Math.max(1, Math.round(body.split(/\s+/).length / 220));
