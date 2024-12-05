# Mailman: Email Client Application  

A robust email client application that enables users to securely send, receive, and manage emails. Built with advanced features like batch processing, caching, and secure credential management, the application ensures efficient and safe communication.  

## Features  

1. **User Authentication**  
   - Secure login using Gmail App Passwords.  
   - Credentials are encrypted and stored in MongoDB.  

2. **Email Management**  
   - Fetch emails using the Internet Message Access Protocol (IMAP).  
   - Send emails securely using the Simple Mail Transfer Protocol (SMTP).  
   - View sent emails and manage inbox efficiently.  

3. **Batch Processing**  
   - Emails are processed in smaller batches for enhanced performance.  

4. **Caching Mechanism**  
   - Frequently accessed data is cached to reduce server calls and improve response time.  

5. **Secure Storage**  
   - User credentials are encrypted using bcrypt before storage in MongoDB.  

6. **Live Demo**  
   - [View Live Demo](https://mailman-kappa.vercel.app/)  

---

## How to Use  

### Login  
1. Open the login page: `/auth/login`.  
2. Enter your email and app password.  
3. Click the **Login** button to access your account.  

### Fetch Emails  
1. Navigate to the **Inbox**: `/dashboard/inbox`.  
2. Emails are fetched in batches and displayed incrementally.  

### Fetch Sent Mails  
1. Go to the **Sent Mail** section: `/dashboard/sent`.  
2. View all emails you have sent.  

### Send Emails  
1. Open the **Compose Email** page: `/dashboard/compose`.  
2. Fill in the recipient's email, subject, and message content.  
3. Click the **Send** button to deliver the email.  

---

## Technical Details  

1. **Email Protocols**  
   - **IMAP (Internet Message Access Protocol)**: Used to fetch emails from the inbox.  
   - **SMTP (Simple Mail Transfer Protocol)**: Used for sending outgoing emails.  

2. **Batch Processing**  
   - Emails are retrieved in chunks for optimized performance.  

3. **Caching**  
   - Leveraged to store frequently accessed data, reducing the need for repetitive database queries.  

4. **Encryption and Decryption**  
   - **Encryption**: User credentials are encrypted using bcrypt before storage.  
   - **Decryption**: Credentials are decrypted securely in memory when needed.  

5. **MongoDB Storage**  
   - Encrypted credentials are stored in MongoDB.  
   - MongoDB is also used to store user details.  

6. **Security**  
   - All communication with Gmail servers is encrypted using SSL/TLS.  

---