# Troubleshooting Password Reset Email Issues

## Current Issue
The password reset email is being sent successfully according to Firebase (`sendPasswordResetEmail` completes without error), but the email is not being received.

## Debugging Steps

### 1. Check Firebase Console - Authentication → Users
1. Go to Firebase Console → Authentication → Users
2. Search for the email: `news@gouache.art`
3. Verify:
   - Does the email exist in Firebase Auth?
   - What is the exact email address (case-sensitive)?
   - Is the email verified?
   - What sign-in providers are enabled?

### 2. Check Firebase Console - Authentication → Email Templates
1. Go to Firebase Console → Authentication → Email templates
2. Check "Password reset" template:
   - Is it enabled?
   - Is the template customized?
   - Does it have the correct app name and logo?
   - Check the "Action URL" setting

### 3. Check Firebase Console - Authentication → Settings → Authorized Domains
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Verify that your domain is listed:
   - `gouache.art`
   - `localhost` (for development)
   - Any other domains you're using

### 4. Check Email Delivery
Even if Firebase says the email was sent, it might not be delivered due to:
- **Spam filters**: Check spam/junk folder
- **Email provider filtering**: Some email providers filter Firebase emails
- **Domain reputation**: If your domain is new, emails might be filtered
- **SMTP configuration**: If using custom SMTP, check the configuration

### 5. Check Browser Console
The code now includes extensive logging. Check the browser console for:
- `Email exists in Firebase Auth: true/false`
- `Sign-in methods for this email: [...]`
- Any error messages
- `Password reset email sent successfully`

### 6. Common Issues and Solutions

#### Issue: Email exists in Firestore but not in Firebase Auth
**Solution**: The email in Firestore doesn't match the email in Firebase Auth. You need to either:
- Update the email in Firestore to match Firebase Auth
- Create the account in Firebase Auth with the correct email
- Use the email that exists in Firebase Auth

#### Issue: Email template not configured
**Solution**: 
1. Go to Firebase Console → Authentication → Email templates
2. Enable and configure the "Password reset" template
3. Set the action URL to: `https://gouache.art/login` (or your domain)

#### Issue: Domain not authorized
**Solution**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your domain: `gouache.art`
3. Wait a few minutes for changes to propagate

#### Issue: Email going to spam
**Solution**:
- Check spam/junk folder
- Whitelist Firebase emails
- Check email provider's spam filter settings
- Consider using a custom SMTP server

#### Issue: Email delay
**Solution**: 
- Wait 5-10 minutes for email delivery
- Check email provider's server status
- Check Firebase status page

## Testing

To test if the issue is with the email or Firebase:
1. Try resetting password for a different email that you know exists in Firebase Auth
2. Check Firebase Console → Authentication → Users to see what emails are actually registered
3. Try using the exact email from Firebase Auth (not from Firestore)

## Next Steps

1. **Check the browser console** for the new detailed logs
2. **Check Firebase Console** → Authentication → Users to see if `news@gouache.art` exists
3. **Check Firebase Console** → Authentication → Email templates to verify configuration
4. **Check spam folder** in the email account
5. **Try a different email** that you know exists in Firebase Auth

## Contact Support

If the issue persists after checking all of the above:
1. Check Firebase Console for any error messages
2. Check browser console for detailed error logs
3. Verify email template configuration
4. Verify domain authorization
5. Check email provider's spam filter

