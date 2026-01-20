📚 Documentație API

Toate răspunsurile de succes sunt returnate în format JSON.
Erorile au formatul standard: `{ "error": "Mesajul erorii" }`.

Base URL: `http://localhost:3000/api`

## 1. 👤 Users (Utilizatori)

### Register
Creează un cont nou.
* **Endpoint:** `POST /users/register`
* **Body (JSON):**
    ```json
    {
      "username": "ion_popescu",
      "email": "ion@example.com",
      "password": "ParolaSigura123"
    }
    ```
* **Status Succes:** `201 Created`

### Login
Autentificare și primire Token JWT.
* **Endpoint:** `POST /users/login`
* **Body (JSON):**
    ```json
    {
      "email": "ion@example.com",
      "password": "ParolaSigura123"
    }
    ```
* **Răspuns Succes:**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": { ... }
    }
    ```

### Add Favorite (Adaugă la Favorite)
Adaugă un jucător la lista de favorite a utilizatorului logat.
* **Auth:** Necesită Token (Header: `Authorization: Bearer <token>`)
* **Endpoint:** `POST /users/favorites`
* **Body (JSON):**
    * `type`: Trebuie să fie "player" sau "team".
    * `player_id`: ID-ul valid al jucătorului (ObjectId).
    ```json
    {
      "type": "player",
      "player_id": "507f1f77bcf86cd799439022"
    }
    ```
* **Status Succes:** `201 Created`

---

## 2. ⚽ Sport (Echipe & Jucători)

### Create Team (Adaugă Echipă)
* **Auth:** Necesită Token
* **Endpoint:** `POST /sport/teams`
* **Body (JSON):**
    ```json
    {
      "name": "FC Barcelona",
      "league": "La Liga",
      "coach": "Hansi Flick",
      "founded_year": 1899
    }
    ```
* **Status Succes:** `200 OK`

### Get All Teams
* **Endpoint:** `GET /sport/teams`
* **Răspuns:** O listă `[]` cu obiecte de tip Team.

---

## 3. 💰 Commerce (Prețuri & Tranzacții)

### Create Pricing Plan
Definește un abonament nou (ex: lunar, anual).
* **Auth:** Necesită Token (Admin)
* **Endpoint:** `POST /commerce/pricing`
* **Body (JSON):**
    * Datele trebuie să respecte structura din tabela `pricing`.
    ```json
    {
      "duration_months": 12,
      "monthly_payment_usd": 10.00,
      "payment_total_usd": 120.00,
      "unlocked_service_id": "507f1f77bcf86cd799439099"
    }
    ```
* **Status Succes:** `201 Created`

### Create Transaction
Înregistrează o plată efectuată de utilizator.
* **Auth:** Necesită Token
* **Endpoint:** `POST /commerce/transactions`
* **Body (JSON):**
    ```json
    {
      "plan_id": "709c1f77bcf86cd799439077",
      "amount": 50.00
    }
    ```
* **Notă:** `user_id` este extras automat din token, iar `created_at` este generat automat.
* **Status Succes:** `201 Created`