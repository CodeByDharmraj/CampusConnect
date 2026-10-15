export const navigationByRole = {
  student: [
    { label: "Dashboard", href: "/dashboard", icon: "⌂" },
    { label: "Announcements", href: "/announcements", icon: "▤" },
    { label: "My Courses", href: "/courses", icon: "▦" },
    { label: "My Attendance", href: "/attendance", icon: "◷" },
    { label: "Assignments", href: "/assignments", icon: "✓" },
  ],

  faculty: [
    { label: "Dashboard", href: "/dashboard", icon: "⌂" },
    { label: "Announcements", href: "/announcements", icon: "▤" },
    { label: "My Courses", href: "/courses", icon: "▦" },
    { label: "Attendance", href: "/attendance", icon: "◷" },
    { label: "Assignments", href: "/assignments", icon: "✓" },
    {
      label: "Correction Requests",
      href: "/attendance/corrections",
      icon: "↻",
    },
  ],

  admin: [
    { label: "Dashboard", href: "/dashboard", icon: "⌂" },
    { label: "Announcements", href: "/announcements", icon: "▤" },
    { label: "Courses", href: "/courses", icon: "▦" },
    { label: "Users", href: "/admin/users", icon: "♙" },
    {
      label: "Attendance Overview",
      href: "/attendance",
      icon: "◷",
    },
  ],
};
