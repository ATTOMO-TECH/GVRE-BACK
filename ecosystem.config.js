module.exports = {
  apps : [{
    name   : "GVRE-CRM-BACKEND",
    script : "./src/index.js",
    env_production: {
	PORT: 3500,
	MONGODB_URI_PREP:  "mongodb+srv://db_user_admin:oud73k5MxqnJhF0v@cluster0.c4emj.mongodb.net/gvre-crm?authSource=admin&replicaSet=atlas-tno40k-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true",
	// MONGODB_URI: "mongodb+srv://gvreadmin:P9vxkd801T4f35F2@db-mongodb-prod-crm-e062a978.mongo.ondigitalocean.com/gvre?authSource=admin&replicaSet=db-mongodb-prod-crm&tls=true&tlsCAFile=/usr/local/share/ca-certificates/gvremongo/ca-certificate.crt",
	BUCKET_NAME: "gvre-images",
	AWS_ACCESS_KEY_ID: "ACJADUAJCSUF6INZH7XU",
	AWS_SECRET_ACCESS_KEY: "xjX7q/kz3OAY9tYU3Mh7USC1kSqrDEvETaoCPM0QRTg",
	S3_ENDPOINT: "fra1.digitaloceanspaces.com",
	GVRE_PASS_MATEO_HERNANDEZ: "qtgveybjekoyigpj",
	GVRE_PASS_IVAN_SANCHEZ: "cqfvhntajcpdaypn",
	GVRE_PASS_ALEJANDRA_GESCHE: "GVreisladeoza16",
	GVRE_PASS_ALEJANDRO_ESAIN: "GVreisladeoza16",
	GVRE_PASS_ANA_GOMEZ_DE_LA_SERNA: "GVreisladeoza16",
	GVRE_PASS_ANA_MARIA_BAREÑO: "tvbgiwbkcbetrdvi",
	GVRE_PASS_BEATRIZ_MATEO_SAGASTA: "xkzkiluvmpnhtkhd",
	GVRE_PASS_CARI_MAHIQUES: "gefmkprbeoimccob",
	GVRE_PASS_DAVID_SALCEDO: "lefvnnxxciooyvad",
	GVRE_PASS_DAVID_ORTEGA: "srqldlmgvhuikozx",
	GVRE_PASS_INES_COCA: "lfjgizkrggpesvyq",
	GVRE_PASS_IRENE_BLASCO: "GVreisladeoza16-",
	GVRE_PASS_LETICIA_MONREAL: "GVreisladeoza16",
	GVRE_PASS_LUCIA_SUAREZ_ZULOAGA: "aytwbxdeluvlerdx",
	GVRE_PASS_MARIA_MARQUEZ_DE_LA_PLATA: "kjaaowbbkdkaxmmp",
	GVRE_PASS_MARTA_GOMEZ_FAIÑA: "GVreisladeoza16",
	GVRE_PASS_MONTSE_ARAGON: "GVreisladeoza16",
	GVRE_PASS_NURIA_SALCEDO: "bohzuamafvixaeae",
	GVRE_PASS_SOFIA_FIERROS: "bpgxkukdzivgbbhz",
	GVRE_PASS_TERESA_BAREÑO: "bvupzilpooakfmed",
	GVRE_PASS_TERESA_RUIZ: "GVreisladeoza16-",
	GVRE_PASS_TULA_JORDAN_DE_URRIES: "zbqkxpdxcgqsqeeb",
	GVRE_PASS_VICTORIA_MIÑANA: "GVreisladeoza16",
	GVRE_PASS_RETAIL: "xluxifdlqjkjxzgk",
    NODE_ENV: "production"
    },
    env_development: {
       NODE_ENV: "development"
    }
  }]
}
