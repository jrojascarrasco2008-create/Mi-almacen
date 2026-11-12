const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();
const DIAS = 2;
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
const dif = (exp, h) => Math.round((Date.parse(exp + "T00:00:00Z") - Date.parse(h + "T00:00:00Z")) / 864e5);

(async () => {
  const h = hoy();
  const stores = await db.collection("stores").listDocuments();
  for (const s of stores) {
    const items = (await s.collection("items").where("st", "==", "active").get()).docs.map(d => d.data());
    const urg = items.filter(i => dif(i.exp, h) <= DIAS);
    if (!urg.length) continue;
    const dd = (await s.collection("devices").get()).docs.filter(d => d.data().token);
    if (!dd.length) continue;
    const venc = urg.filter(i => dif(i.exp, h) < 0).length;
    const nombres = urg.slice(0, 3).map(i => i.name).join(", ") + (urg.length > 3 ? " y " + (urg.length - 3) + " más" : "");
    const title = urg.length + " producto" + (urg.length > 1 ? "s" : "") + " por vencer" + (venc ? " (" + venc + " ya vencido" + (venc > 1 ? "s" : "") + ")" : "");
    const r = await fcm.sendEachForMulticast({ tokens: dd.map(d => d.data().token), notification: { title, body: nombres + ". ¿Los pones en oferta?" } });
    r.responses.forEach((x, i) => {
      const c = (x.error && x.error.code) || "";
      if (!x.success && /not-registered|invalid-argument/.test(c)) dd[i].ref.delete();
    });
    console.log(s.id, urg.length, "productos ->", r.successCount, "avisos enviados");
  }
})().catch(e => { console.error(e); process.exit(1); });
