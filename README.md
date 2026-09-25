# Nemesis Liquid Glass — Account backend

## Что исправлено

- Сервис аутентификации используется только для входа и регистрации.
- Регистрация создаёт `users/{uid}`.
- Username резервируется в `usernames/{usernameKey}` через `runTransaction`.
- Dashboard и Profile не используют `displayName`/localStorage как источник профиля.
- После входа приложение проверяет наличие `users/{uid}` и обновляет `lastSeenAt`, `active`, `currentProduct`.

## Структура пользователя

`users/{uid}`:

- uid
- username
- usernameKey
- email
- plan
- role
- subscriptionStatus
- expiresAt
- createdAt
- lastSeenAt
- active
- currentProduct
- downloads.minecraft
- downloads.lineage2m

## Account backend
