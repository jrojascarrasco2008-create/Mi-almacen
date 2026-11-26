const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();
const DIAS = 2;
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
const hora = () => parseInt(new Date().toLocaleString("en-US", { timeZone: "America/Santiago", hour: "numeric", hour12: false }), 10) % 24;
const lunes = () => new Date().toLocaleDateString("en-US", { timeZone: "America/Santiago", weekday: "short" }) === "Mon";
const dif = (exp, h) => Math.round((Date.parse(exp + "T00:00:00Z") - Date.parse(h + "T00:00:00Z")) / 864e5);

(async () => {
  const h = hoy(), manana = hora() < 12;
  const stores = await db.collection("stores").listDocuments();
  for (const s of stores) {
    const st = (await s.get()).data();
    if (!st || !st.paidUntil || st.paidUntil.toMillis() < Date.now()) continue;
    const dd = (await s.collection("devices").get()).docs.filter(d => d.data().token);
    if (!dd.length) continue;
    const enviar = async (title, body) => {
      const r = await fcm.sendEachForMulticast({ tokens: dd.map(d => d.data().token), notification: { title, body } });
      r.responses.forEach((x, i) => {
        const c = (x.error && x.error.code) || "";
        if (!x.success && /not-registered|invalid-argument/.test(c)) dd[i].ref.delete();
      });
      return r.successCount;
    };
    const items = (await s.collection("items").where("st", "==", "active").get()).docs.map(d => d.data());
    const urg = items.filter(i => { const d = dif(i.exp, h); return d <= DIAS || (d <= (i.aviso || DIAS) && manana); });
    if (urg.length) {
      const venc = urg.filter(i => dif(i.exp, h) < 0).length;
      const nombres = urg.slice(0, 3).map(i => i.name).join(", ") + (urg.length > 3 ? " y " + (urg.length - 3) + " más" : "");
      const title = urg.length + " producto" + (urg.length > 1 ? "s" : "") + " por vencer" + (venc ? " (" + venc + " ya vencido" + (venc > 1 ? "s" : "") + ")" : "");
      console.log(s.id, urg.length, "por vencer ->", await enviar(title, nombres + ". ¿Los pones en oferta?"), "avisos");
    }
    if (lunes() && manana) {
      const q = await s.collection("items").where("ts", ">=", Date.now() - 7 * 864e5).get();
      let so = 0, w = 0, plata = 0;
      q.docs.forEach(d => { const x = d.data(); if (x.st === "sold") so += x.qty || 1; else if (x.st === "waste") { w += x.qty || 1; plata += (x.cost || 0) * (x.qty || 1); } });
      if (so + w > 0) console.log(s.id, "resumen ->", await enviar("📊 Tu semana en Mi Almacén", "Vendiste a tiempo " + so + " un. y botaste " + w + " un." + (plata ? " (unos $" + plata.toLocaleString("es-CL") + ")" : "") + "."), "avisos");
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
