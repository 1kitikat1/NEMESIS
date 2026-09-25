
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { ref, onValue, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const $ = id => document.getElementById(id);
const set = (id, value) => { if ($(id)) $(id).textContent = value ?? "—"; };

$("logoutBtn")?.addEventListener("click", async () => {
  if (auth.currentUser) {
    await update(ref(db, `users/${auth.currentUser.uid}`), {
      active: false,
      lastSeenAt: serverTimestamp(),
      currentProduct: "offline"
    }).catch(()=>{});
  }
  await signOut(auth);
  location.href = "../";
});

function render(data, uid) {
  if (!data) {
    set("userName", "—");
    set("userEmail", "—");
    set("uid", uid);
    set("planName", "—");
    set("planStatus", "Профиль не найден");
    return;
  }

  set("userName", data.username);
  set("userEmail", data.email);
  set("uid", data.uid || uid);
  set("planName", String(data.plan || "free").toUpperCase());
  set("planStatus", data.subscriptionStatus === "active" ? "Активна" : "Без подписки");
  set("overviewName", data.username);
  set("overviewEmail", data.email);
  set("role", data.role);
  set("product", data.currentProduct);
  set("createdAt", data.createdAt ? new Date(data.createdAt).toLocaleString("ru-RU") : "—");
}

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "../login/";
    return;
  }

  const userRef = ref(db, `users/${user.uid}`);

  // UI читается только из Realtime Database.
  onValue(userRef, async snap => {
    if (!snap.exists()) {
      render(null, user.uid);
      return;
    }
    const data = snap.val();
    render(data, user.uid);

    await update(userRef, {
      lastSeenAt: serverTimestamp(),
      active: true,
      currentProduct: "dashboard"
    });
  }, error => {
    console.error("Profile load error:", error);
    set("planStatus", "Ошибка загрузки профиля");
  });
});
