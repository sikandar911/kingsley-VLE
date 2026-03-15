# Changes Documentation

এই ডকুমেন্টে সকল পরিবর্তন এবং নতুন features সম্পর্কে তথ্য রয়েছে।

---

## 📋 পরিবর্তনের সারাংশ

### 1. **Sidebar Navigation - Dropdown Menu যোগ হয়েছে**

#### ফাইল: `src/components/Sidebar/Sidebar.jsx`

**কী পরিবর্তন হয়েছে:**

- Sidebar এ collapsible dropdown menu functionality যোগ করা হয়েছে
- Admin, Student এবং Teacher এর জন্য আলাদা মেনু স্ট্রাকচার তৈরি করা হয়েছে

**Admin Sidebar Menu:**

```
⊞ Dashboard (সরাসরি লিংক)
👥 User Management (Dropdown)
   ├── 🎓 Students → /admin/users?role=student
   └── 👨‍🏫 Teachers → /admin/users?role=teacher
📚 Student Access (Dropdown)
   ├── 📚 My Courses → /student/courses
   ├── 📋 Assignments → /student/assignments
   └── 🏆 Results → /student/results
📚 Teacher Access (Dropdown)
   ├── 📚 My Courses → /teacher/courses
   ├── 📋 Assignments → /teacher/assignments
   └── 🎓 Students → /teacher/students
```

**Student Sidebar Menu:**

```
⊞ Dashboard (সরাসরি লিংক)
📚 Courses & Learning (Dropdown)
   ├── 📚 My Courses
   ├── 📋 Assignments
   └── 🏆 Results
👤 Profile (সরাসরি লিংক)
```

**Teacher Sidebar Menu:**

```
⊞ Dashboard (সরাসরি লিংক)
📚 Teaching (Dropdown)
   ├── 📚 My Courses
   ├── 📋 Assignments
   └── 🎓 Students
👤 Profile (সরাসরি লিংক)
```

**নতুন State Variable:**

- `expandedItems` - কোন dropdown খোলা আছে তা track করে

**নতুন Function:**

- `toggleSubmenu(label)` - Dropdown খোলা/বন্ধ করার জন্য

---

### 2. **নতুন Routes যোগ করা হয়েছে**

#### ফাইল: `src/App.jsx`

**নতুন Student Routes:**

- `/student/courses` → StudentCoursesPage
- `/student/assignments` → StudentAssignmentsPage
- `/student/results` → StudentResultsPage

**নতুন Teacher Routes:**

- `/teacher/courses` → TeacherCoursesPage
- `/teacher/assignments` → TeacherAssignmentsPage
- `/teacher/students` → TeacherStudentsPage

**নতুন Admin Route:**

- `/admin/users` → AdminUserManagement (Students/Teachers management)

**নতুন Imports:**

```javascript
import AdminUserManagement from "./Dashboard/Admin/pages/AdminUserManagement";
import StudentCoursesPage from "./Dashboard/Student/pages/StudentCoursesPage";
import StudentAssignmentsPage from "./Dashboard/Student/pages/StudentAssignmentsPage";
import StudentResultsPage from "./Dashboard/Student/pages/StudentResultsPage";
import TeacherCoursesPage from "./Dashboard/Teacher/pages/TeacherCoursesPage";
import TeacherAssignmentsPage from "./Dashboard/Teacher/pages/TeacherAssignmentsPage";
import TeacherStudentsPage from "./Dashboard/Teacher/pages/TeacherStudentsPage";
```

---

### 3. **নতুন Component Pages তৈরি হয়েছে**

#### Student Pages:

1. **`src/Dashboard/Student/pages/StudentCoursesPage.jsx`**
   - Student এর courses দেখানোর জন্য
   - Route: `/student/courses`

2. **`src/Dashboard/Student/pages/StudentAssignmentsPage.jsx`**
   - Student এর assignments দেখানোর জন্য
   - Route: `/student/assignments`

3. **`src/Dashboard/Student/pages/StudentResultsPage.jsx`**
   - Student এর results দেখানোর জন্য
   - Route: `/student/results`

#### Teacher Pages:

1. **`src/Dashboard/Teacher/pages/TeacherCoursesPage.jsx`**
   - Teacher এর courses দেখানোর জন্য
   - Route: `/teacher/courses`

2. **`src/Dashboard/Teacher/pages/TeacherAssignmentsPage.jsx`**
   - Teacher এর assignments দেখানোর জন্য
   - Route: `/teacher/assignments`

3. **`src/Dashboard/Teacher/pages/TeacherStudentsPage.jsx`**
   - Teacher এর students দেখানোর জন্য
   - Route: `/teacher/students`

#### Admin Page:

1. **`src/Dashboard/Admin/pages/AdminUserManagement.jsx`**
   - Students এবং Teachers manage করার জন্য
   - Route: `/admin/users?role=student` বা `/admin/users?role=teacher`
   - Features:
     - Tab switching (Students/Teachers)
     - Search functionality
     - User create/edit/delete
     - Query parameter handling (`?role=`)

---

### 4. **Functionality Details**

#### Sidebar Dropdown Toggling:

```javascript
const toggleSubmenu = (label) => {
  setExpandedItems((prev) => ({
    ...prev,
    [label]: !prev[label],
  }));
};
```

#### Route Protection:

- সকল routes `ProtectedRoute` দ্বারা সুরক্ষিত
- Admin routes শুধুমাত্র admin আছে দেখতে পারবে
- Student routes শুধুমাত্র student দেখতে পারবে
- Teacher routes শুধুমাত্র teacher দেখতে পারবে

#### AdminUserManagement Features:

- Query parameters থেকে role নির্ধারণ (`?role=student` বা `?role=teacher`)
- Tab switching functionality
- Search by name, email, username
- Create/Edit/Delete users
- Stats display (Total Students, Teachers, Courses)

---

### 5. **ব্যবহারকারীর অভিজ্ঞতা পরিবর্তন**

| Role        | আগে                        | এখন                                                            |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| **Admin**   | Dashboard এবং Direct links | Dashboard + Expandable dropdowns সহ সম্পূর্ণ নিয়ন্ত্রণ        |
| **Student** | Dashboard এবং Profile      | Dashboard + Expandable "Courses & Learning" dropdown + Profile |
| **Teacher** | Dashboard এবং Profile      | Dashboard + Expandable "Teaching" dropdown + Profile           |

---

### 6. **নতুন File Structure**

```
src/
├── App.jsx (Modified - নতুন routes যোগ)
├── components/
│   └── Sidebar/
│       └── Sidebar.jsx (Modified - dropdown functionality)
├── Dashboard/
│   ├── Admin/
│   │   └── pages/
│   │       └── AdminUserManagement.jsx (New)
│   ├── Student/
│   │   └── pages/
│   │       ├── StudentCoursesPage.jsx (New)
│   │       ├── StudentAssignmentsPage.jsx (New)
│   │       └── StudentResultsPage.jsx (New)
│   └── Teacher/
│       └── pages/
│           ├── TeacherCoursesPage.jsx (New)
│           ├── TeacherAssignmentsPage.jsx (New)
│           └── TeacherStudentsPage.jsx (New)
```

---

### 7. **Testing করার উপায়**

**Admin হিসেবে Test করুন:**

1. Admin account দিয়ে login করুন
2. Sidebar এ dropdown গুলো click করুন
3. "User Management" dropdown থেকে Students/Teachers manage করুন
4. "Student Access" এবং "Teacher Access" dropdown এ view করুন

**Student হিসেবে Test করুন:**

1. Student account দিয়ে login করুন
2. "Courses & Learning" dropdown open করুন
3. My Courses, Assignments, Results click করুন

**Teacher হিসেবে Test করুন:**

1. Teacher account দিয়ে login করুন
2. "Teaching" dropdown open করুন
3. My Courses, Assignments, Students click করুন

---

### 8. **ভবিষ্যৎ উন্নতির সুযোগ**

এই pages গুলো প্রাথমিকভাবে placeholder। এখানে যা যোগ করা যায়:

- Actual data fetching from backend
- Creating/Editing/Deleting courses
- Assignment submission system
- Results calculation
- Student list management

---

**Last Updated:** March 12, 2026
