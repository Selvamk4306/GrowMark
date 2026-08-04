export interface WebTestCase {
  id: string;
  module: string;
  name: string;
  expected: string;
  type: 'login' | 'signup' | 'onboarding' | 'dashboard' | 'profile' | 'sales' | 'reports' | 'health-score';
  data?: Record<string, string>;
}

export const webTestCases: WebTestCase[] = [];
let testIndex = 1;

function addCase(module: string, type: WebTestCase['type'], name: string, expected: string, data: Record<string, string> = {}) {
  webTestCases.push({
    id: `WEB-${String(testIndex).padStart(3, '0')}`,
    module,
    name,
    expected,
    type,
    data,
  });
  testIndex += 1;
}

// Login Coverage (60 cases)
addCase('Login', 'login', 'Verify login page renders with branding and form inputs', 'Login screen loads with GrowMark logo and email/password fields.');
addCase('Login', 'login', 'Verify login page language preference link is visible', 'Language Preference link is visible on login page.');
addCase('Login', 'login', 'Verify Google sign-in button is visible on login page', 'Google sign-in CTA is visible on login page.');
addCase('Login', 'login', 'Verify sign up navigation link is visible on login page', 'Sign up link is visible and clickable.');

const invalidEmails = ['', 'plainaddress', 'missing@domain', 'missing.domain@', 'missing@.com', 'user@domain..com', 'user@domain,com', 'user@domain@domain.com', 'john@doe', 'john@domain.c'];
invalidEmails.forEach((email, idx) => {
  addCase(
    'Login',
    'login',
    `Validate login rejects invalid email input: ${email || '<empty>'}`,
    'Login form validation rejects invalid email address format.',
    { email, password: 'Password123' }
  );
});

const invalidPasswords = ['', '123', 'short', 'abc', 'abc123', 'p@ss', '      ', 'password', 'PASSWORD', '123456'];
invalidPasswords.forEach((pwd, idx) => {
  addCase(
    'Login',
    'login',
    `Validate login rejects weak password input: ${pwd || '<empty>'}`,
    'Login form validation rejects empty or weak password input.',
    { email: 'user@example.com', password: pwd }
  );
});

const loginValidations = [
  { email: 'user@example.com', password: '' },
  { email: '', password: 'Password123' },
  { email: 'user@example.com', password: 'WrongPass1' },
  { email: 'notfound@domain.com', password: 'Password123' },
  { email: 'user@example.com', password: 'Password@123' },
];
loginValidations.forEach((data, idx) => {
  addCase(
    'Login',
    'login',
    `Verify login validation scenario ${idx + 1} for empty or invalid credentials`,
    'Login flow displays correct validation or error message for invalid credentials.',
    data
  );
});

for (let i = 1; i <= 40; i += 1) {
  addCase(
    'Login',
    'login',
    `Confirm login screen stability scenario ${i}`,
    'Login screen remains stable across repeated load and click actions.'
  );
}

// Signup Coverage (70 cases)
addCase('Signup', 'signup', 'Verify signup page renders with form labels and inputs', 'Signup page loads with Name, Email, Password, Confirm Password fields.');
addCase('Signup', 'signup', 'Verify route from login to signup page works', 'Clicking Sign up on login navigates to the signup screen.');
addCase('Signup', 'signup', 'Verify back navigation from signup to login route', 'Return to login screen from signup page works.');

const signupNames = ['', 'A', 'Jo', 'John123', 'John@', 'John Doe', 'Juan Pérez', 'A'.repeat(70), 'Test User', 'Valid Name'];
signupNames.forEach((name, idx) => {
  addCase(
    'Signup',
    'signup',
    `Validate signup name field validation for input: ${name || '<empty>'}`,
    'Signup form validation checks full name format and minimum length.',
    { fullName: name, email: 'signup@example.com', password: 'Password123', confirmPassword: 'Password123' }
  );
});

const signupEmails = ['', 'plainaddress', 'user@', 'user@domain', 'user@domain.', 'user@domain.c', 'user@domain..com', 'user@.com', 'valid.user@domain.com', 'test+alias@domain.co'];
signupEmails.forEach((email) => {
  addCase(
    'Signup',
    'signup',
    `Validate signup email field validation for input: ${email || '<empty>'}`,
    'Signup form validation rejects invalid email address formats.',
    { fullName: 'Valid Name', email, password: 'Password123', confirmPassword: 'Password123' }
  );
});

const signupPasswords = [
  { pwd: '', confirm: '' },
  { pwd: '123', confirm: '123' },
  { pwd: 'Password123', confirm: 'Password124' },
  { pwd: 'Password123', confirm: '' },
  { pwd: 'Password@1', confirm: 'Password@1' },
  { pwd: 'Weak', confirm: 'Weak' },
  { pwd: 'StrongPwd#1', confirm: 'StrongPwd#1' },
  { pwd: 'spaces in pwd', confirm: 'spaces in pwd' },
  { pwd: 'Mismatch!123', confirm: 'Mismatch?123' },
  { pwd: 'ValidPass123', confirm: 'ValidPass123' }
];
signupPasswords.forEach((pair) => {
  addCase(
    'Signup',
    'signup',
    `Verify signup password validation: pwd='${pair.pwd}' confirm='${pair.confirm}'`,
    'Signup form validates password strength and confirm password matching.',
    { fullName: 'Valid Name', email: 'signup@example.com', password: pair.pwd, confirmPassword: pair.confirm }
  );
});

for (let i = 1; i <= 30; i += 1) {
  addCase(
    'Signup',
    'signup',
    `Confirm signup UI stability scenario ${i}`,
    'Signup page remains stable under repeated input and navigation actions.'
  );
}

// Onboarding Coverage (50 cases)
const languages = ['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam'];
languages.forEach((language) => {
  addCase(
    'Onboarding',
    'onboarding',
    `Verify onboarding language selection for ${language}`,
    `Language selection works for ${language} and persists on continue.`,
    { language }
  );
});

addCase('Onboarding', 'onboarding', 'Verify language screen prompts if no selection is made', 'Onboarding prevents continue until a language is selected.');

for (let i = 1; i <= 25; i += 1) {
  addCase(
    'Onboarding',
    'onboarding',
    `Verify shop setup screen handles entry validations scenario ${i}`,
    'Shop setup screen shows proper validation feedback for missing or invalid values.'
  );
}

for (let i = 1; i <= 15; i += 1) {
  addCase(
    'Onboarding',
    'onboarding',
    `Verify item setup and onboarding completion scenario ${i}`,
    'Onboarding item setup and continue path behaves correctly across screen flows.'
  );
}

// Dashboard Coverage (60 cases)
const dashboardPages = ['dashboard', 'daily-analysis', 'growth-tips', 'health-score', 'reports', 'profile', 'manage-items'];
dashboardPages.forEach((page) => {
  addCase(
    'Dashboard',
    'dashboard',
    `Verify dashboard navigation to ${page} page`,
    `Dashboard navigation loads ${page} page successfully.`,
    { page }
  );
});

for (let i = 1; i <= 45; i += 1) {
  addCase(
    'Dashboard',
    'dashboard',
    `Verify dashboard tab flow scenario ${i}`,
    'Dashboard tab flow remains stable across repeated page transitions.'
  );
}

// Profile Coverage (30 cases)
for (let i = 1; i <= 30; i += 1) {
  addCase(
    'Profile',
    'profile',
    `Verify profile page update scenario ${i}`,
    'Profile page accepts edits and retains data across refreshes.'
  );
}

// Sales & Reports Coverage (60 cases)
const salesActions = ['item selection', 'quantity update', 'discount application', 'total calculation', 'submit sale'];
salesActions.forEach((action) => {
  addCase(
    'Sales Entry',
    'sales',
    `Verify sales entry ${action} workflow`,
    `Sales entry ${action} workflow works correctly on the web app.`,
    { action }
  );
});
for (let i = 1; i <= 45; i += 1) {
  addCase(
    'Sales Entry',
    'sales',
    `Verify sales screen stability scenario ${i}`,
    'Sales entry screen remains functional through repeated input flows.'
  );
}

// Reports and Health Score Coverage (55 cases)
for (let i = 1; i <= 30; i += 1) {
  addCase(
    'Reports',
    'reports',
    `Verify report generation display scenario ${i}`,
    'Reports page loads summary charts and lists correctly.'
  );
}
for (let i = 1; i <= 25; i += 1) {
  addCase(
    'Health Score',
    'health-score',
    `Verify health score screen scenario ${i}`,
    'Health score screen displays current health metric and recommendations.'
  );
}
