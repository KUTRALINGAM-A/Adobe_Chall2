import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/ideacloud", "routes/ideacloud.tsx"),
  route("/connectdots", "routes/connectdots.tsx"),
  route("/gemeniresult", "routes/gemeniresult.tsx"),
  route("/getwhatmatters", "routes/getwhatmatters.tsx"),
] satisfies RouteConfig;