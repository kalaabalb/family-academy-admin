import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
  Collapse,
  ListItemButton,
  Button,
  Chip,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  Category,
  Book,
  Payment,
  People,
  Person,
  Settings as SettingsIcon,
  Notifications,
  Devices,
  Assessment,
  VideoLibrary,
  Notes,
  Quiz,
  History,
  Logout,
  ExpandLess,
  ExpandMore,
  Home,
  Message,
  CloudUpload,
  BarChart,
  MenuBook,
  Assignment,
  QuestionAnswer,
  PlayCircle,
  CheckCircle,
  Lock,
} from '@mui/icons-material';

const drawerWidth = 300;

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  
  // Collapsible sections
  const [contentOpen, setContentOpen] = useState(true);
  const [coursesOpen, setCoursesOpen] = useState({});

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleUserMenuClose();
  };

  const toggleCourse = (courseId) => {
    setCoursesOpen(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Get user's assigned courses from localStorage or context
  const assignedCourses = user?.assigned_courses || [];

  // Teacher Menu Items (only what they can access)
  const teacherMenuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    },
    {
      text: 'My Courses',
      icon: <MenuBook />,
      type: 'courses',
      courses: assignedCourses,
    },
    {
      text: 'Content Management',
      icon: <VideoLibrary />,
      subItems: [
        { text: 'Chapters', path: '/chapters', icon: <Book />, courseFilter: true },
        { text: 'Videos', path: '/videos', icon: <PlayCircle />, courseFilter: true },
        { text: 'Notes', path: '/notes', icon: <Notes />, courseFilter: true },
        { text: 'Practice Questions', path: '/questions', icon: <Quiz />, courseFilter: true },
        { text: 'Exams', path: '/exams', icon: <Assessment />, courseFilter: true },
      ],
    },
  ];

  // Admin Menu Items (full access)
  const adminMenuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    },
    {
      text: 'Schools',
      icon: <School />,
      path: '/schools',
    },
    {
      text: 'Categories',
      icon: <Category />,
      path: '/categories',
    },
    {
      text: 'Courses',
      icon: <MenuBook />,
      path: '/courses',
    },
    {
      text: 'Content Management',
      icon: <VideoLibrary />,
      subItems: [
        { text: 'Chapters', path: '/chapters', icon: <Book /> },
        { text: 'Videos', path: '/videos', icon: <PlayCircle /> },
        { text: 'Notes', path: '/notes', icon: <Notes /> },
        { text: 'Practice Questions', path: '/questions', icon: <Quiz /> },
        { text: 'Exams', path: '/exams', icon: <Assessment /> },
      ],
    },
    {
      text: 'User Management',
      icon: <People />,
      subItems: [
        { text: 'Users', path: '/users', icon: <People /> },
        { text: 'Teachers', path: '/teachers', icon: <Person /> },
      ],
    },
    {
      text: 'Financial',
      icon: <Payment />,
      path: '/payments',
    },
    {
      text: 'Communication',
      icon: <Message />,
      path: '/notifications',
    },
    {
      text: 'System',
      icon: <SettingsIcon />,
      subItems: [
        { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
        { text: 'Devices', path: '/devices', icon: <Devices /> },
        { text: 'System Logs', path: '/system-logs', icon: <History /> },
      ],
    },
  ];

  const menuItems = isAdmin() ? adminMenuItems : teacherMenuItems;

  const renderMenuItem = (item) => {
    // For teachers, check if they have access to this item based on assigned courses
    if (isTeacher() && item.courseFilter && assignedCourses.length === 0) {
      return (
        <ListItemButton disabled sx={{ opacity: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'text.disabled' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text}
            secondary="No courses assigned"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
          <Lock fontSize="small" color="disabled" />
        </ListItemButton>
      );
    }

    if (item.type === 'courses' && isTeacher()) {
      return (
        <>
          <ListItemButton
            onClick={() => setContentOpen(!contentOpen)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              secondary={`${assignedCourses.length} course(s)`}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            {contentOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          
          <Collapse in={contentOpen} timeout="auto">
            <List component="div" disablePadding>
              {assignedCourses.map((course) => (
                <ListItemButton
                  key={course.id}
                  component={Link}
                  to={`/courses/${course.id}`}
                  selected={location.pathname === `/courses/${course.id}`}
                  onClick={isMobile ? handleDrawerToggle : undefined}
                  sx={{
                    pl: 4,
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <MenuBook fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={course.name}
                    secondary={course.category_name}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip 
                    label={course.status || 'Active'} 
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.6rem' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </>
      );
    }

    if (item.subItems) {
      // Filter subitems for teachers based on assigned courses
      const filteredSubItems = isTeacher() && item.courseFilter
        ? assignedCourses.length > 0 ? item.subItems : []
        : item.subItems;

      if (filteredSubItems.length === 0) return null;

      return (
        <>
          <ListItemButton
            onClick={() => setContentOpen(!contentOpen)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
            {contentOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          
          <Collapse in={contentOpen} timeout="auto">
            <List component="div" disablePadding>
              {filteredSubItems.map((subItem) => (
                <ListItemButton
                  key={subItem.text}
                  component={Link}
                  to={subItem.path}
                  selected={location.pathname === subItem.path}
                  onClick={isMobile ? handleDrawerToggle : undefined}
                  sx={{
                    pl: 4,
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{subItem.icon}</ListItemIcon>
                  <ListItemText primary={subItem.text} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </>
      );
    }

    return (
      <ListItemButton
        component={Link}
        to={item.path}
        selected={location.pathname === item.path}
        onClick={isMobile ? handleDrawerToggle : undefined}
        sx={{
          borderRadius: 1,
          mb: 0.5,
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            '& .MuiListItemIcon-root': { color: 'primary.main' },
          },
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    );
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'white',
            color: 'primary.main',
            fontWeight: 'bold',
          }}
        >
          FA
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            Family Academy
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {isAdmin() ? 'Administrator' : 'Teacher'}
          </Typography>
        </Box>
      </Box>

      {/* User Info */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight="medium" noWrap>
              {user?.name || user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role}
            </Typography>
          </Box>
          {isTeacher() && (
            <Chip 
              label={`${assignedCourses.length} Courses`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Menu Items */}
      <List sx={{ flex: 1, px: 2, pt: 2, overflow: 'auto' }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            {renderMenuItem(item)}
          </React.Fragment>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            color: 'error.main',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.1),
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          v2.0.0 • {isAdmin() ? 'Admin' : 'Teacher'} Portal
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, color: 'primary.main' }}>
              {(() => {
                // Find current page title
                const allItems = [...adminMenuItems, ...teacherMenuItems];
                for (const item of allItems) {
                  if (item.path === location.pathname) return item.text;
                  if (item.subItems) {
                    const subItem = item.subItems.find(sub => sub.path === location.pathname);
                    if (subItem) return subItem.text;
                  }
                }
                return 'Dashboard';
              })()}
            </Typography>
          </Box>

          {isTeacher() && (
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Badge badgeContent={assignedCourses.length} color="primary">
                <MenuBook />
              </Badge>
            </IconButton>
          )}
          
          <IconButton onClick={handleUserMenuOpen}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 280, borderRadius: 2 },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user?.name || user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role}
          </Typography>
          {isTeacher() && (
            <Typography variant="caption" color="text.secondary" display="block">
              {assignedCourses.length} Assigned Course(s)
            </Typography>
          )}
        </Box>
        <Divider />
        {isAdmin() && (
          <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            System Settings
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}><Logout fontSize="small" /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Sidebar Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'grey.50',
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            p: 3,
            minHeight: 'calc(100vh - 100px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;