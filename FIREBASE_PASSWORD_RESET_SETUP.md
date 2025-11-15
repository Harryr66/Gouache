# Firebase Password Reset Email Setup

## Issues Fixed

1. **Button Unresponsive**: Fixed by moving the Dialog outside the FormField and using a regular Button with onClick handler instead of DialogTrigger nested in the form.

2. **Email Not Sending**: This can have several causes:

## Important Notes About Firebase Password Reset

### Firebase Requirements

1. **Email must exist in Firebase Auth**: Firebase's `sendPasswordResetEmail` only works if the email exists in Firebase Authentication, not just in Firestore. The email must match exactly (case-insensitive) with the email used during signup.

2. **Email Templates**: Firebase requires email templates to be configured in the Firebase Console:
   - Go to Firebase Console → Authentication → Templates
   - Ensure "Password reset" template is enabled
   - Check that the template is properly configured with your app name and logo

3. **Authorized Domains**: Make sure your domain is authorized in Firebase Console:
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your domain (e.g., `gouache.art`) if not already listed

4. **Email Service**: Firebase uses its default email service, but you can configure a custom SMTP server:
   - Go to Firebase Console → Authentication → Settings → Email templates
   - Configure custom SMTP if needed

### Common Issues

1. **Email in Firestore doesn't match Firebase Auth**: 
   - If users signed up with usernames, the email in Firestore might not match the email in Firebase Auth
   - Solution: The code now looks up the email from Firestore and uses it, but it must match the email in Firebase Auth

2. **Email not verified**:
   - Firebase sends password reset emails even if the email is not verified
   - However, some email providers might filter these emails

3. **Email in spam folder**:
   - Password reset emails might end up in spam/junk folders
   - Check spam folder and whitelist Firebase emails

4. **Too many requests**:
   - Firebase limits password reset requests to prevent abuse
   - If you get "too-many-requests" error, wait a few minutes before trying again

## Testing

To test password reset:

1. Use an email address that exists in Firebase Auth (not just Firestore)
2. Check the browser console for error messages
3. Check the spam folder for the reset email
4. Verify that the email template is configured in Firebase Console

## Debugging

The code now includes console logging to help debug:
- `console.log('Looking up username:', username)` - When looking up username
- `console.log('Found user data:', userData)` - When user data is found
- `console.log('Using email from Firestore:', emailToUse)` - Email being used
- `console.log('Sending password reset email to:', emailToUse)` - Email being sent
- `console.error('Password reset error:', error)` - Any errors

Check the browser console for these messages when testing.

## Next Steps

1. Verify email templates are configured in Firebase Console
2. Verify authorized domains include your domain
3. Test with an email that definitely exists in Firebase Auth
4. Check Firebase Console → Authentication → Users to see what emails are registered
5. If emails still don't send, check Firebase Console → Authentication → Email templates for any errors

