const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const correo = (process.env.CORREO || "").trim().toLowerCase();
const dias = parseInt(process.env.DIAS || "30", 10);

(async () => {
  if (!correo || !(dias > 0)) throw new Error("Falta el correo o los días");
  const q = await db.collection("stores").where("ownerMail", "==", correo).get();
  if (q.empty) { console.log("No encontré ningún almacén con el correo " + correo); process.exit(1); }
  for (const d of q.docs) {
    const cur = d.data().paidUntil ? d.data().paidUntil.toMillis() : 0;
    const nuevo = Math.max(cur, Date.now()) + dias * 864e5;
    await d.ref.update({ paidUntil: admin.firestore.Timestamp.fromMillis(nuevo) });
    console.log(d.id, "pagado hasta", new Date(nuevo).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }));
  }
})().catch(e => { console.error(e); process.exit(1); });
