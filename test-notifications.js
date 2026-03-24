// test-notifications.js
// Run with: node test-notifications.js

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_URL = 'https://family-academy-backend-a12l.onrender.com/api/v1';
let ADMIN_TOKEN = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

// Test users to create
const TEST_USERS = [
  { username: 'test_paid_1', password: 'Test123!', status: 'paid', category: 6 },
  { username: 'test_paid_2', password: 'Test123!', status: 'paid', category: 1 },
  { username: 'test_unpaid_1', password: 'Test123!', status: 'unpaid' },
  { username: 'test_unpaid_2', password: 'Test123!', status: 'unpaid' },
  { username: 'test_expired_1', password: 'Test123!', status: 'expired' },
  { username: 'test_parent_1', password: 'Test123!', status: 'parent' },
  { username: 'test_progress_1', password: 'Test123!', status: 'paid', category: 6 },
  { username: 'test_streak_1', password: 'Test123!', status: 'paid', category: 1 },
  { username: 'test_teacher_1', password: 'Teacher123!', role: 'teacher' }
];

// Templates to test
const TEMPLATES_TO_TEST = [
  { id: 14, name: 'Achievement Unlocked', type: 'achievement' },
  { id: 15, name: 'Admin Announcement', type: 'announcement' },
  { id: 16, name: 'Child Chapter Completed', type: 'parent' },
  { id: 17, name: 'Child Progress Report', type: 'parent' },
  { id: 18, name: 'Child Streak Update', type: 'parent' },
  { id: 19, name: 'Daily Motivation', type: 'motivation' },
  { id: 10, name: 'Exam Available', type: 'exam' },
  { id: 12, name: 'Exam Reminder', type: 'exam' },
  { id: 11, name: 'Exam Result Available', type: 'exam' },
  { id: 9, name: 'Exam Scheduled', type: 'exam' },
  { id: 5, name: 'Payment Pending', type: 'payment' },
  { id: 3, name: 'Payment Rejected', type: 'payment' },
  { id: 2, name: 'Payment Verified', type: 'payment' },
  { id: 4, name: 'Subscription Expired', type: 'payment' },
  { id: 1, name: 'Subscription Expiring', type: 'payment' },
  { id: 6, name: 'Video Released', type: 'content' },
  { id: 7, name: 'Note Released', type: 'content' },
  { id: 8, name: 'Chapter Released', type: 'content' }
];

async function loginAsAdmin() {
  log.step('Logging in as admin');
  
  try {
    // First try with superadmin credentials from your database
    const response = await axios.post(`${API_URL}/auth/admin-login`, {
      username: 'superadmin',
      password: 'superadmin'  // Try this first
    });
    
    if (response.data.success) {
      ADMIN_TOKEN = response.data.data.token;
      log.success('Admin login successful with superadmin/superadmin');
      return true;
    }
  } catch (error) {
    log.warn('First login attempt failed, trying with admin credentials...');
  }
  
  try {
    // Try with admin credentials
    const response = await axios.post(`${API_URL}/auth/admin-login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      ADMIN_TOKEN = response.data.data.token;
      log.success('Admin login successful with admin/admin123');
      return true;
    }
  } catch (error) {
    log.warn('Second attempt failed, please enter your credentials manually');
  }
  
  // If both fail, ask for credentials
  return new Promise((resolve) => {
    rl.question('Enter admin username: ', (username) => {
      rl.question('Enter admin password: ', async (password) => {
        try {
          const response = await axios.post(`${API_URL}/auth/admin-login`, {
            username: username,
            password: password
          });
          
          if (response.data.success) {
            ADMIN_TOKEN = response.data.data.token;
            log.success('Admin login successful!');
            resolve(true);
          } else {
            log.error('Login failed');
            resolve(false);
          }
        } catch (error) {
          log.error(`Login failed: ${error.response?.data?.message || error.message}`);
          resolve(false);
        }
      });
    });
  });
}

async function createTestUsers() {
  log.step('Creating test users');
  
  const users = [];
  
  for (const user of TEST_USERS) {
    try {
      log.info(`Creating user: ${user.username}`);
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: user.username,
        password: user.password,
        deviceId: `TEST_DEVICE_${Date.now()}`,
        fcmToken: `TEST_FCM_${Date.now()}`
      });
      
      if (response.data.success) {
        const userId = response.data.data.user.id;
        log.success(`✅ Created user ${user.username} (ID: ${userId})`);
        users.push({ ...user, id: userId });
      }
    } catch (error) {
      if (error.response?.status === 409) {
        log.warn(`User ${user.username} already exists, skipping...`);
        // Try to get existing user ID
        try {
          const login = await axios.post(`${API_URL}/auth/student-login`, {
            username: user.username,
            password: user.password,
            deviceId: 'TEST_DEVICE'
          });
          if (login.data.success) {
            const userId = login.data.data.user.id;
            users.push({ ...user, id: userId });
            log.success(`✅ Found existing user ${user.username} (ID: ${userId})`);
          }
        } catch (loginError) {
          log.error(`Could not get existing user ID for ${user.username}`);
        }
      } else {
        log.error(`Failed to create ${user.username}: ${error.response?.data?.message || error.message}`);
      }
    }
  }
  
  return users;
}

async function setupTestData(users) {
  log.step('Setting up test data (subscriptions, progress, streaks)');
  
  for (const user of users) {
    try {
      // Create subscriptions for paid users
      if (user.status === 'paid' && user.category) {
        try {
          await axios.post(`${API_URL}/subscriptions`, {
            user_id: user.id,
            category_id: user.category,
            start_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            billing_cycle: 'monthly'
          }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
          });
          log.success(`✅ Created active subscription for ${user.username} (category ${user.category})`);
        } catch (subError) {
          log.warn(`Subscription for ${user.username} may already exist`);
        }
      }
      
      // Create expired subscriptions
      if (user.status === 'expired') {
        try {
          await axios.post(`${API_URL}/subscriptions`, {
            user_id: user.id,
            category_id: 1,
            start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            expiry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'expired',
            billing_cycle: 'monthly'
          }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
          });
          log.success(`✅ Created expired subscription for ${user.username}`);
        } catch (subError) {
          log.warn(`Expired subscription for ${user.username} may already exist`);
        }
      }
      
      // Create parent links
      if (user.status === 'parent') {
        try {
          await axios.post(`${API_URL}/parent-links`, {
            user_id: user.id,
            parent_telegram_id: 123456789,
            token: `TEST_TOKEN_${user.id}`,
            token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'linked'
          }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
          });
          log.success(`✅ Created parent link for ${user.username}`);
        } catch (parentError) {
          log.warn(`Parent link for ${user.username} may already exist`);
        }
      }
      
      // Create progress data
      if (user.username.includes('progress')) {
        try {
          await axios.post(`${API_URL}/progress/save`, {
            chapter_id: 9,
            video_progress: 100,
            notes_viewed: true,
            questions_attempted: 10,
            questions_correct: 8
          }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
          });
          log.success(`✅ Created progress data for ${user.username}`);
        } catch (progressError) {
          log.warn(`Progress data for ${user.username} failed`);
        }
      }
      
      // Create streak data
      if (user.username.includes('streak')) {
        try {
          for (let i = 0; i < 7; i++) {
            await axios.post(`${API_URL}/streaks/update`, {}, {
              headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
            });
          }
          log.success(`✅ Created streak data for ${user.username}`);
        } catch (streakError) {
          log.warn(`Streak data for ${user.username} failed`);
        }
      }
      
    } catch (error) {
      log.error(`Setup failed for ${user.username}: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testAllTemplates() {
  log.step('Testing all notification templates');
  
  const results = [];
  
  for (const template of TEMPLATES_TO_TEST) {
    try {
      log.info(`Testing template: ${template.name} (${template.type})`);
      
      // Test with different target types based on template type
      const testCases = [];
      
      switch (template.type) {
        case 'payment':
          testCases.push(
            { target_type: 'all', desc: 'All users' },
            { target_type: 'paid_users', desc: 'Paid users' },
            { target_type: 'unpaid_users', desc: 'Unpaid users' }
          );
          break;
          
        case 'parent':
          testCases.push(
            { target_type: 'parents', desc: 'Parents only' }
          );
          break;
          
        case 'exam':
        case 'content':
        case 'achievement':
          testCases.push(
            { target_type: 'paid_users', desc: 'Paid users' }
          );
          break;
          
        default:
          testCases.push(
            { target_type: 'all', desc: 'All users' },
            { target_type: 'specific_user', target_id: 40, desc: 'Specific user (kalaabale)' }
          );
      }
      
      for (const testCase of testCases) {
        try {
          const payload = {
            template_id: template.id,
            target_type: testCase.target_type,
            variables: getVariablesForTemplate(template.type)
          };
          
          if (testCase.target_id) {
            payload.target_id = testCase.target_id;
          }
          
          const response = await axios.post(`${API_URL}/notifications/send`, payload, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
          });
          
          if (response.data.success) {
            log.success(`  ✅ ${template.name} -> ${testCase.desc}: ${response.data.message}`);
            results.push({
              template: template.name,
              target: testCase.desc,
              success: true,
              notification_id: response.data.data?.notification_id
            });
          }
        } catch (error) {
          log.error(`  ❌ ${template.name} -> ${testCase.desc}: ${error.response?.data?.message || error.message}`);
          results.push({
            template: template.name,
            target: testCase.desc,
            success: false,
            error: error.response?.data?.message
          });
        }
      }
      
      // Wait a bit between templates to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      log.error(`Failed to test template ${template.name}: ${error.message}`);
    }
  }
  
  return results;
}

async function testSchedules() {
  log.step('Testing scheduled notifications');
  
  try {
    // Get all schedules
    const schedules = await axios.get(`${API_URL}/notifications/schedules`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    log.info(`Found ${schedules.data.data.length} schedules`);
    
    for (const schedule of schedules.data.data) {
      log.info(`\nSchedule: ${schedule.name} (ID: ${schedule.id})`);
      log.info(`  Type: ${schedule.schedule_type}`);
      log.info(`  Next run: ${schedule.next_run}`);
      log.info(`  Active: ${schedule.is_active}`);
      
      // Force run this schedule (set next_run to now)
      await axios.patch(`${API_URL}/notifications/schedules/${schedule.id}/toggle`, {
        is_active: true
      }, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      
      log.success(`  ✅ Activated schedule`);
    }
    
    log.info('\nSchedules activated. They will run at their next scheduled time.');
    
  } catch (error) {
    log.error(`Schedule test failed: ${error.response?.data?.message || error.message}`);
  }
}

async function verifyClientDelivery() {
  log.step('Verifying client-side delivery');
  
  const users = [40, 81]; // kalaabale and bravery
  
  for (const userId of users) {
    try {
      log.info(`Checking notifications for user ${userId}...`);
      
      // Get username from ID
      let username = 'unknown';
      if (userId === 40) username = 'kalaabale';
      else if (userId === 81) username = 'bravery';
      
      // Login as user to get their notifications
      const login = await axios.post(`${API_URL}/auth/student-login`, {
        username: username,
        password: 'Test123!',
        deviceId: 'TEST_DEVICE'
      });
      
      const userToken = login.data.data.token;
      
      const notifications = await axios.get(`${API_URL}/notifications/my-notifications`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      log.success(`✅ User ${username} (${userId}) has ${notifications.data.data.length} notifications`);
      
      notifications.data.data.slice(0, 5).forEach((n, i) => {
        log.info(`  ${i+1}. ${n.title} - ${n.message.substring(0, 50)}...`);
      });
      
    } catch (error) {
      log.error(`Failed to check user ${userId}: ${error.response?.data?.message || error.message}`);
    }
  }
}

function getVariablesForTemplate(type) {
  const base = {
    amount: '1000',
    category_name: 'Mathematics',
    student_name: 'Test Student',
    streak_count: '7',
    days_remaining: '3',
    exam_title: 'Midterm Exam',
    course_name: 'Algebra',
    chapter_name: 'Chapter 5',
    video_title: 'Introduction to Variables',
    note_title: 'Key Formulas',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    rejection_reason: 'Incorrect amount',
    score: '85',
    passed: '✅ Passed',
    result: 'passed',
    total_questions: '20',
    correct_answers: '17',
    time_taken: '45 min',
    motivational_message: 'Keep up the great work!',
    achievement_title: 'Quick Learner',
    achievement_message: 'You completed your first chapter!',
    hours_remaining: '2',
    start_date: new Date().toLocaleString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString(),
    exam_id: '123',
    study_days: '5',
    study_hours: '8.5',
    chapters_completed: '3',
    questions_attempted: '45',
    accuracy: '88',
    week_streak: '7',
    study_days_change: '+2',
    accuracy_change: '+5',
    achievements_text: '🏆 Perfect Week\n🔥 7-Day Streak',
    announcement_title: 'System Update',
    announcement_message: 'We have added new features!'
  };
  
  // Add type-specific overrides
  switch (type) {
    case 'payment':
      base.amount = '1500';
      base.category_name = 'Premium Package';
      break;
    case 'parent':
      base.student_name = 'Alex';
      base.study_days = '7';
      break;
    case 'achievement':
      base.achievement_title = 'Chapter Master';
      base.achievement_message = 'Completed 5 chapters!';
      break;
  }
  
  return base;
}

async function runTests() {
  log.step('STARTING COMPREHENSIVE NOTIFICATION TEST');
  log.info(`Time: ${new Date().toISOString()}`);
  
  // Login as admin
  if (!await loginAsAdmin()) {
    log.error('Cannot proceed without admin access');
    process.exit(1);
  }
  
  // Create test users
  const users = await createTestUsers();
  
  // Set up test data
  await setupTestData(users);
  
  // Test all templates
  const results = await testAllTemplates();
  
  // Test schedules
  await testSchedules();
  
  // Verify client delivery
  await verifyClientDelivery();
  
  // Summary
  log.step('TEST SUMMARY');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log.info(`Total templates tested: ${results.length}`);
  log.success(`✅ Successful: ${successful}`);
  if (failed > 0) log.error(`❌ Failed: ${failed}`);
  
  log.step('NEXT STEPS');
  log.info('1. Check the app notification screen on test devices');
  log.info('2. Verify push notifications appear');
  log.info('3. Check database for notification_logs');
  log.info('4. Run SQL to verify delivery:');
  console.log(`
    SELECT nl.user_id, u.username, n.title, nl.status, nl.created_at 
    FROM notification_logs nl
    JOIN users u ON nl.user_id = u.id
    JOIN notifications n ON nl.notification_id = n.id
    ORDER BY nl.created_at DESC
    LIMIT 50;
  `);
  
  rl.close();
}

// Run the tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});