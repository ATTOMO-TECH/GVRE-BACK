const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const session = require("express-session");
const express = require("express");

const MongoStore = require("connect-mongo");
const passport = require("passport");
require("./auth");
const db = require("./db");
const cors = require("cors");
const app = express();

// Routes
const indexRoutes = require("./routes/index.routes");
const authRoutes = require("./routes/auth.routes");
const adRoutes = require("./routes/ad.routes");
const requestRoutes = require("./routes/request.routes");
const contactRoutes = require("./routes/contact.routes");
const consultantRoutes = require("./routes/consultant.routes");
const zoneRoutes = require("./routes/zone.routes");
const mailsRoutes = require("./routes/mails.routes");
const catalogsRoutes = require("./routes/catalog.routes");
const webRoutes = require("./routes/web.routes");
const marketingCampaignsRoutes = require("./routes/marketingCampaing.routes");
const { authValidator } = require("./middlewares/auth.validator");

db.connect();

// Settings
const PORT = process.env.PORT || 3500;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "x-www-form-urlencoded, Origin, X-Requested-With, Content-Type, Accept, Authorization, *"
  );
  return next();
});

app.use(
  cors({
    origin: [
      "http://157.230.97.167",
      "https://gvre-images.fra1.digitaloceanspaces.com/",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://www.gvre.es",
      "https://gvre.es",
      "https://vamosaporello.com",
      "https://www.vamosaporello.com",
      "https://attomo-crm.com",
      "https://sleepy-visvesvaraya-241527.netlify.app",
      "https://modest-darwin-2e96d1.netlify.app",
      "https://ubiquitous-dieffenbachia-2437f4.netlify.app",
      "https://gvre.vercel.app",
      "https://imaginative-platypus-b47d86.netlify.app",
      "https://apiweb-gvre.vercel.app/",
      "https://prepgvreweb.vercel.app/",
      "https://gvre-migration-prep.netlify.app",
      "https://crmfront-gvre-pre-production.vercel.app",
      "https://gvre-web-seo-prod.netlify.app",
      "https://crmfront-gvre.vercel.app",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.set("trust proxy", 1);
app.use(
  session({
    secret: 'asd!WQe!"3d.asd0/)12/3Adcq',
    resave: false,
    proxy: true,
    saveUninitialized: false,
    cookie: {
      maxAge: 8760 * 3600 * 1000,
    },
    store: MongoStore.create({ mongoUrl: db.DB_URL }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Consultant authentication validator
// app.use(authValidator);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/ads", adRoutes);
app.use("/inmuebles", adRoutes);
app.use("/requests", requestRoutes);
app.use("/contacts", contactRoutes);
app.use("/consultants", consultantRoutes);
app.use("/zones", zoneRoutes);
app.use("/mails", mailsRoutes);
app.use("/catalogs", catalogsRoutes);
app.use("/web", webRoutes);
app.use("/marketingCampaigns", marketingCampaignsRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = app;
