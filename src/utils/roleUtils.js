// Role-based utility functions
export const roleUtils = {
  isSuperAdmin: (user) => user?.role === 'admin' || user?.role === 'superadmin',
  isAdmin: (user) => user?.role === 'admin',
  isTeacher: (user) => user?.role === 'teacher',
  isStudent: (user) => user?.role === 'student',
  
  // Get permissions based on role
  getPermissions: (user) => {
    if (!user) return [];
    
    const basePermissions = [];
    
    if (roleUtils.isSuperAdmin(user)) {
      return [
        'dashboard_view',
        'schools_manage',
        'categories_manage',
        'courses_manage',
        'chapters_manage',
        'videos_manage',
        'notes_manage',
        'questions_manage',
        'exams_manage',
        'payments_verify',
        'users_manage',
        'teachers_manage',
        'notifications_send',
        'settings_manage',
        'telegram_manage',
        'logs_view',
        'devices_manage',
      ];
    }
    
    if (roleUtils.isTeacher(user)) {
      return [
        'content_create',
        'content_edit',
        'content_view',
      ];
    }
    
    return basePermissions;
  },
  
  hasPermission: (user, permission) => {
    const permissions = roleUtils.getPermissions(user);
    return permissions.includes(permission);
  }
};