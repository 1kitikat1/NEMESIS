
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  ref, get, set, runTransaction, update, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const form = document.getElementById("registerForm") || document.getElementById("loginForm");
const msg = document.getElementById("authMessage");

function show(text, ok=false) {
  if (!msg) return;
  msg.textContent = text;
  msg.className = "status " + (ok ? "ok" : "");
}

function errorText(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use":"Этот email уже зарегистрирован.",
    "auth/invalid-email":"Введите корректный email.",
    "auth/weak-password":"Пароль должен содержать минимум 6 символов.",
    "auth/invalid-credential":"Неверный email или пароль.",
    "auth/too-many-requests":"Слишком много попыток. Попробуйте позже.",
    "PERMISSION_DENIED":"Не удалось сохранить профиль. Проверьте настройки доступа."
  };
  return map[code] || error?.message || "Произошла ошибка.";
}

function busy(on, text) {
  const b = form?.querySelector("button[type=submit]");
  if (!b) return;
  if (on) {
    b.dataset.old = b.textContent;
    b.disabled = true;
    b.textContent = text;
  } else {
    b.disabled = false;
    b.textContent = b.dataset.old || b.textContent;
  }
}

const register = document.getElementById("registerForm");

if (register) {
  onAuthStateChanged(auth, user => {
    if (user) location.href = "../dashboard/";
  });

  register.addEventListener("submit", async e => {
    e.preventDefault();

    const username = register.username.value.trim();
    const email = register.email.value.trim().toLowerCase();
    const password = register.password.value;
    const password2 = register.password2?.value ?? password;

    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      show("Username: 3–24 символа, только латиница, цифры, _ . -");
      return;
    }
    if (password !== password2) {
      show("Пароли не совпадают.");
      return;
    }

    busy(true, "Создаём аккаунт…");
    show("Создаём аккаунт…", true);

    try {
      // 1. Создаём Firebase Authentication account.
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      const key = username.toLowerCase();

      // 2. Резервируем username в RTDB атомарно.
      const usernameRef = ref(db, `usernames/${key}`);
      const reservation = await runTransaction(usernameRef, current => {
        if (current !== null) return;
        return {
          uid: user.uid,
          username
        };
      });

      if (!reservation.committed) {
        await user.delete();
        throw new Error("Этот username уже занят.");
      }

      await updateProfile(user, { displayName: username });

      // 3. ВСЕ профильные данные — в RTDB.
      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        username,
        usernameKey: key,
        email,
        plan: "free",
        role: "user",
        subscriptionStatus: "inactive",
        expiresAt: null,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        active: true,
        currentProduct: "website",
        downloads: {
          minecraft: 0,
          lineage2m: 0
        }
      });

      show("Аккаунт успешно создан.", true);
      setTimeout(() => location.href = "../dashboard/", 500);
    } catch (error) {
      console.error(error);
      show(errorText(error));
    } finally {
      busy(false);
    }
  });
}

const login = document.getElementById("loginForm");

if (login) {
  onAuthStateChanged(auth, user => {
    if (user) location.href = "../dashboard/";
  });

  login.addEventListener("submit", async e => {
    e.preventDefault();
    busy(true, "Входим…");
    show("Входим…", true);

    try {
      const email = login.email.value.trim().toLowerCase();
      const password = login.password.value;
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // После входа обязательно проверяем RTDB.
      const snap = await get(ref(db, `users/${user.uid}`));
      if (!snap.exists()) {
        throw new Error("Профиль аккаунта не найден. Попробуйте войти снова.");
      }

      await update(ref(db, `users/${user.uid}`), {
        lastSeenAt: serverTimestamp(),
        active: true,
        currentProduct: "website"
      });

      location.href = "../dashboard/";
    } catch (error) {
      console.error(error);
      show(errorText(error));
    } finally {
      busy(false);
    }
  });
}
