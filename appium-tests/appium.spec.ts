import { expect } from 'chai';

describe('GrowMark Mobile Application - Automated E2E Spec Cases', () => {
    
    describe('Login Screen Validation Tests', () => {
        it('should verify branding elements and title text on launch', async () => {
            const appTitle = await $('//android.widget.TextView[@text="GrowMark"]');
            expect(await appTitle.isDisplayed()).to.be.true;
            
            const tagline = await $('//android.widget.TextView[@text="Track. Analyse. Grow."]');
            expect(await tagline.isDisplayed()).to.be.true;
        });

        it('should show error when submitting empty fields', async () => {
            const loginButton = await $('//android.view.ViewGroup[@content-desc="Login"]');
            await loginButton.click();

            // Verify native dialog pops up with empty fields warning
            const alertTitle = await $('//android.widget.TextView[@resource-id="android:id/alertTitle"]');
            expect(await alertTitle.getText()).to.equal('Error');

            const alertMsg = await $('//android.widget.TextView[@resource-id="android:id/message"]');
            expect(await alertMsg.getText()).to.equal('Please enter both email and password.');

            const okButton = await $('//android.widget.Button[@resource-id="android:id/button1"]');
            await okButton.click();
        });

        it('should toggle password visibility on clicking eye icon', async () => {
            const passwordInput = await $('//android.widget.EditText[@text="Enter your password"]');
            await passwordInput.setValue('testpassword123');

            // Find secure eye toggle icon wrapper
            const eyeIcon = await $('//android.widget.EditText[@text="Enter your password"]/following-sibling::android.view.ViewGroup');
            await eyeIcon.click();

            // Secure entry changes attribute
            expect(await passwordInput.getAttribute('password')).to.equal('false');
        });
    });

    describe('Signup Screen Validation Tests', () => {
        it('should navigate to Sign Up screen from login page', async () => {
            const signupLink = await $('//android.widget.TextView[@text="Sign up"]');
            await signupLink.click();

            // Verify title of registration screen
            const registerTitle = await $('//android.widget.TextView[@text="Create Account"]');
            expect(await registerTitle.isDisplayed()).to.be.true;
        });

        it('should trigger name validation when name field is too short', async () => {
            const nameInput = await $('//android.widget.EditText[@text="Full Name"]');
            await nameInput.setValue('Jo');

            const emailInput = await $('//android.widget.EditText[@text="Enter your email"]');
            await emailInput.setValue('newuser@example.com');

            const submitBtn = await $('//android.view.ViewGroup[@content-desc="Sign Up"]');
            await submitBtn.click();

            const alertMsg = await $('//android.widget.TextView[@resource-id="android:id/message"]');
            expect(await alertMsg.getText()).to.contain('at least 3 characters');

            const okButton = await $('//android.widget.Button[@resource-id="android:id/button1"]');
            await okButton.click();
        });
    });

    describe('Shop Onboarding Setup Screen Tests', () => {
        it('should show Step 1 progress indicator', async () => {
            const progress = await $('//android.widget.TextView[contains(@text,"Step 1")]');
            expect(await progress.getText()).to.equal('Step 1 of 3');
        });

        it('should validate empty shop name input', async () => {
            const shopName = await $('//android.widget.EditText[@text="Enter shop name"]');
            await shopName.setValue('');

            const nextBtn = await $('//android.view.ViewGroup[@content-desc="Next"]');
            await nextBtn.click();

            const alertMsg = await $('//android.widget.TextView[@resource-id="android:id/message"]');
            expect(await alertMsg.getText()).to.contain('Shop Name and Shop Type are required');

            const okButton = await $('//android.widget.Button[@resource-id="android:id/button1"]');
            await okButton.click();
        });

        it('should select Grocery chip category successfully', async () => {
            const groceryChip = await $('//android.widget.TextView[@text="Grocery"]');
            await groceryChip.click();
            // Verify selected state background color/attributes
        });
    });

    describe('Sales Entry and Calculations Tests', () => {
        it('should calculate grand total with discounts correctly in checkout cart', async () => {
            // Select item
            const itemSelect = await $('//android.view.ViewGroup[@content-desc="Item Selection"]');
            await itemSelect.click();
            const appleItem = await $('//android.widget.TextView[@text="Apple"]');
            await appleItem.click();

            // Set quantity
            const qtyInput = await $('//android.widget.EditText[@text="1"]');
            await qtyInput.setValue('5');

            // Apply 10% discount
            const discInput = await $('//android.widget.EditText[@text="0"]');
            await discInput.setValue('10');

            // Subtotal should calculate and update dynamically
            const subtotalText = await $('//android.widget.TextView[contains(@text,"Subtotal")]');
            // Assuming Apple costs $2.00, subtotal should be $10.00
            expect(await subtotalText.getText()).to.contain('10.00');

            const grandTotalText = await $('//android.widget.TextView[contains(@text,"Total:")]');
            // Grand total should be $9.00
            expect(await grandTotalText.getText()).to.contain('9.00');
        });
    });
});
