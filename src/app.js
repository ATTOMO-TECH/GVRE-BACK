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
const { isAuth } = require("./middlewares/auth.middleware");

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
const tagsRoutes = require("./routes/tag.routes");
const blogRoutes = require("./routes/blog.routes");
const officeRoutes = require("./routes/office.routes");
const { authValidator } = require("./middlewares/auth.validator");

// Settings
const PORT = process.env.PORT || 3500;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "x-www-form-urlencoded, Origin, X-Requested-With, Content-Type, Accept, Authorization, *",
  );
  return next();
});

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://www.gvre.es",
      "https://gvre.es",
      "https://vamosaporello.com",
      "https://www.vamosaporello.com",
      "https://attomo-crm.com",
      "https://gvre-web-seo-prod.netlify.app",
      "https://crm-gvre.netlify.app",
      "https://crm-gvre-development.netlify.app",
      "https://gvre-new-web.netlify.app",
      "https://gvre-old-web.netlify.app",
      "https://dev-gvre-old-web.netlify.app",
      "https://gvre-crm-front.netlify.app",
      "https://dev-gvre-crm-front.netlify.app",
      "https://dev-gvre-new-web.netlify.app",
      "https://prod-gvre-new-web.netlify.app",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
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
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Consultant authentication validator
// app.use(authValidator)

app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/ads", isAuth, adRoutes);
app.use("/inmuebles", adRoutes);
app.use("/requests", isAuth, requestRoutes);
app.use("/contacts", isAuth, contactRoutes);
app.use("/consultants", consultantRoutes);
app.use("/zones", zoneRoutes);
app.use("/mails", mailsRoutes);
app.use("/catalogs", catalogsRoutes);
app.use("/web", webRoutes);
app.use("/blogs", blogRoutes);
app.use("/offices", officeRoutes);
app.use("/marketingCampaigns", isAuth, marketingCampaignsRoutes);
app.use("/tags", isAuth, tagsRoutes);

db.connect()
  .then(() => {
    // Solo si la conexión es exitosa, levantamos el servidor
    app.listen(PORT, () => {
      console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // Si falla, lo capturamos aquí para que Node no crashee de forma fea
    console.error("❌ Deteniendo arranque: No hay base de datos.");
    process.exit(1);
  });

module.exports = app;
