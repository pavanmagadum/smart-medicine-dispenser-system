import app from "../backend/src/app.js";

export const config = {
  runtime: "nodejs18",
};

export default function handler(req, res) {
  return app(req, res);
}
