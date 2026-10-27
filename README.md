# 🎟️ Event Management System (EMS)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![W3Schools Standards](https://img.shields.io/badge/Style-W3Schools%20Standards-04AA6D?style=for-the-badge)](https://www.w3schools.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> A clean, accessible, multi-page frontend web project built strictly with **pure HTML5** and a single external stylesheet (**`style.css`**), adhering to official **W3Schools beginner web development standards**.

---

## 📌 Project Overview

The **Event Management System** is designed as a modular web application that connects four primary user personas in the event ecosystem: **Attendees (Customers)**, **Event Organizers**, **Operations Managers**, and **System Administrators**.

This repository is built without any JavaScript, external CSS frameworks (such as Bootstrap or Tailwind), or third-party font/icon CDNs. It demonstrates mastery of fundamental HTML5 semantic elements, forms, tables, and standard CSS layout techniques.

---

## 🌟 Key Features

- **Semantic HTML5 Architecture**: Implements `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<form>`, and `<table>` tags for clean structure and accessibility.
- **Unified Single Stylesheet (`style.css`)**: All six pages are styled by a single, lightweight external stylesheet with clean box-sizing, typography, and responsive behaviors.
- **W3Schools Beginner Design Standard**:
  - Consistent navigation bar with dark `#333333` theme and `#04AA6D` active highlights.
  - White container cards (`#ffffff`) over a soft `#f2f2f2` canvas.
  - Green `#04AA6D` primary submit buttons with `#45a049` hover state.
  - Red `#f44336` reset/danger buttons with `#da190b` hover state.
- **Complete Form Validation**: Native HTML5 form attributes including `required`, `type="email"`, `type="date"`, `type="number"`, `type="url"`, placeholder text, and explicit `label for="..."` bindings.
- **Multi-Role Authentication**: Dedicated login screen featuring dynamic role selection radio buttons.

---

## 📄 Pages Included

| Page File | Role / Purpose | Key Elements Included |
| :--- | :--- | :--- |
| **`home.html`** / **`index.html`** | Landing Page | Hero banner, services grid, upcoming events data table, quick-access portal cards, standard footer. |
| **`login.html`** | Authentication Portal | Role selection radio buttons (*Admin*, *Customer*, *Organizer*, *Manager*), credential fields, remember-me checkbox, action buttons. |
| **`admin.html`** | Administrator Registration | Department dropdown, clearance level radio buttons, security recovery question, authorization key field. |
| **`OrgRegistration.html`** | Organizer Registration | Agency information, business tax ID, event specialty dropdown, annual event volume, headquarter address. |
| **`Regcustomer.html`** | Customer Registration | Personal details, date of birth picker, gender radio buttons, event interest category checkboxes, newsletter opt-in. |
| **`ManagerReg.html`** | Manager Registration | Operational domain selector, experience input, duty shift radio buttons, emergency contact details. |

---

## 🎨 Color Palette & Typography

| Element | Color Hex | Preview | Notes |
| :--- | :--- | :---: | :--- |
| **Primary Accent** | `#04AA6D` | ![#04AA6D](https://via.placeholder.com/15/04AA6D/04AA6D.png) | W3Schools Green (Active nav, submit buttons, table headers) |
| **Accent Hover** | `#45a049` | ![#45a049](https://via.placeholder.com/15/45a049/45a049.png) | Hover state for interactive primary buttons and links |
| **Reset / Danger** | `#f44336` | ![#f44336](https://via.placeholder.com/15/f44336/f44336.png) | Reset buttons and alert highlights |
| **Danger Hover** | `#da190b` | ![#da190b](https://via.placeholder.com/15/da190b/da190b.png) | Hover state for reset buttons |
| **Navigation / Footer** | `#333333` | ![#333333](https://via.placeholder.com/15/333333/333333.png) | Dark contrast headers, navbar, and footer |
| **Page Background** | `#f2f2f2` | ![#f2f2f2](https://via.placeholder.com/15/f2f2f2/f2f2f2.png) | Soft neutral page background |
| **Card Background** | `#ffffff` | ![#ffffff](https://via.placeholder.com/15/ffffff/ffffff.png) | Form cards and content sections |

- **Font Family**: `Arial, Helvetica, sans-serif`
- **Box Sizing**: Global `* { box-sizing: border-box; }`

---

## 📂 Repository Structure

```text
event-management-system/
├── README.md               # Project documentation & GitHub guide
├── style.css               # Main external stylesheet (W3Schools rules)
├── index.html              # Entry point (mirrors home.html)
├── home.html               # Main landing page & services
├── login.html              # User login with role radio buttons
├── admin.html              # Administrator account registration
├── OrgRegistration.html    # Event host & organizer registration
├── Regcustomer.html        # Attendee customer registration
└── ManagerReg.html         # Venue & facility manager registration
```

---

## 🚀 How to Run Locally

Because this project is built with **pure HTML & CSS**, you do not need any package managers, Node.js, or compilation tools to view it.

### Option 1: Direct File Open
1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/event-management-system.git
   ```
2. Navigate into the project folder.
3. Double-click **`index.html`** or **`home.html`** to open it directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Using VS Code Live Server
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click **`home.html`** (or `index.html`) and select **"Open with Live Server"**.
4. The site will run automatically at `http://127.0.0.1:5500/`.

---

## 🌐 Deploying to GitHub Pages

You can publish this website live for free in under two minutes using GitHub Pages:

1. Push this repository to your GitHub account.
2. In your repository, click **Settings** (top tab).
3. Under the **Code and automation** section in the left sidebar, click **Pages**.
4. Under **Build and deployment > Source**, select **Deploy from a branch**.
5. Set the branch to `main` (or `master`) and folder to `/ (root)`.
6. Click **Save**. Within 1–2 minutes, your live site URL will be ready at:
   ```
   https://<your-username>.github.io/<repository-name>/
   ```

---

## 🎓 Learning Objectives & Best Practices

This project serves as a practical reference for frontend web development students learning:
1. How to structure a multi-page website using relative hyperlinks (`href="login.html"`).
2. Proper form labeling (`<label for="id">`) for web accessibility and user experience.
3. Clean separation of structure (HTML) and presentation (CSS).
4. Responsive column layouts using pure CSS (`float` and clear-fixes / standard media queries).
5. Styling forms, text inputs, radio buttons, checkboxes, and buttons uniformly.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE). Feel free to use it for educational purposes, assignments, or project portfolios.

---

*Made with following clean Web Standards and W3Schools Tutorials.*
*Made by Marufur Rahman Reshat.*
