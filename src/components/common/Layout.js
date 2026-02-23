import React, { useState } from 'react';
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
  Devices,
  History,
  VideoLibrary,
  Notes,
  Quiz,
  Assessment,
  Logout,
  ExpandLess,
  ExpandMore,
  Message,
  MenuBook,
  PlayCircle,
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
  
  // FIXED: Separate states for each collapsible section
  const [openSections, setOpenSections] = useState({
    userManagement: true,
    contentManagement: true,
    system: true,
    myCourses: true,
  });

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

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get user's assigned courses
  const assignedCourses = user?.assigned_courses || [];

  // Admin Menu Items
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
      section: 'contentManagement',
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
      section: 'userManagement',
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
      section: 'system',
      text: 'System',
      icon: <SettingsIcon />,
      subItems: [
        { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
        { text: 'Devices', path: '/devices', icon: <Devices /> },
        { text: 'System Logs', path: '/system-logs', icon: <History /> },
      ],
    },
  ];

  // Teacher Menu Items
  const teacherMenuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    },
    {
      section: 'myCourses',
      text: 'My Courses',
      icon: <MenuBook />,
      subItems: assignedCourses.map(course => ({
        text: course.name,
        path: `/courses/${course.id}`,
        icon: <MenuBook />,
        chip: course.category_name,
      })),
    },
    {
      section: 'contentManagement',
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
  ];

  const menuItems = isAdmin() ? adminMenuItems : teacherMenuItems;

  const renderMenuItem = (item) => {
    // Regular menu item with path
    if (item.path) {
      return (
        <ListItemButton
          key={item.text}
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
    }

    // Section with subitems
    if (item.subItems) {
      // Don't render empty sections
      if (item.subItems.length === 0) return null;

      return (
        <React.Fragment key={item.text}>
          <ListItemButton
            onClick={() => toggleSection(item.section)}
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
            {openSections[item.section] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          
          <Collapse in={openSections[item.section]} timeout="auto">
            <List component="div" disablePadding>
              {item.subItems.map((subItem) => (
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
                  {subItem.chip && (
                    <Chip 
                      label={subItem.chip}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.6rem' }}
                    />
                  )}
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return null;
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
        {menuItems.map((item) => renderMenuItem(item))}
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