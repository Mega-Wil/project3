document.addEventListener('DOMContentLoaded', function() {

  console.log('DOM fully loaded and parsed.')

  // Navigate to correct page depending on button pressed
  document.querySelectorAll('.btn.btn-sm.btn-outline-primary').forEach(button => {
    button.onclick = function() {
      const section = this.id;

        if (section == 'compose') {
          compose_email()
        }
        else {
          load_mailbox(section);
  }
    }
  })

  // By default, load the inbox
  load_mailbox('inbox');

  // Handle compose form submission
  document.querySelector('#compose-form').addEventListener('submit', function(event) {
    // Prevent default form submission: page reload
    event.preventDefault();
    
    // Get form data
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;
    
    // Send email via API
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
      })
    })
    // Handle response
    .then(response => response.json())
    .then(result => {
      console.log(result);
      load_mailbox('sent'); // Redirect to sent mailbox
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });

});

// Function to update browser history and URL
function updateHistory(section) {
  history.pushState({section: section}, "", `${section}`);
}

function compose_email(replyToEmail = null) {
  // Update browser history
  updateHistory('compose');

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Code for reply email
  if (replyToEmail) {
    // Prefill reciepient email
    document.querySelector('#compose-recipients').value = replyToEmail.sender;

    // Add "Re: " prefix if not already present
    const subject = replyToEmail.subject.startsWith('Re: ')
      ? replyToEmail.subject
      : `Re: ${replyToEmail.subject}`;
    document.querySelector('#compose-subject').value = subject;
    
    // Prefill body with original message
    const originalEmail = `\n\nOn ${replyToEmail.timestamp} ${replyToEmail.sender} wrote:\n${replyToEmail.body}`;
    document.querySelector('#compose-body').value = originalEmail;

    // Set cursor at the beginning of the textarea
  document.querySelector('#compose-body').setSelectionRange(0, 0);
  document.querySelector('#compose-body').focus();
  }
  else {
    // Clear out composition fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
  }
}

function load_mailbox(mailbox) {
  // Update browser history
  updateHistory(mailbox);
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name - handle display name for archive
  const displayName = mailbox === 'archive' ? 'Archived' : mailbox.charAt(0).toUpperCase() + mailbox.slice(1);
  document.querySelector('#emails-view').innerHTML = `<h3>${displayName}</h3>`;

  // Fetch emails from the API
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Check if emails are empty
      if (emails.length === 0) {
        document.querySelector('#emails-view').innerHTML += `<p>No emails in this mailbox.</p>`;
        return;
      }
      else {
        // Loop through emails and display them
        emails.forEach(email => {
          const email_element = document.createElement('div');
          email_element.className = 'email-item';

          email_element.innerHTML = `
          <span class="sender">${email.sender}</span>
          <span class="subject">${email.subject}</span>
          <span class="timestamp">${email.timestamp}</span>
        `;
        
        if (mailbox !== 'sent') {
          // Determine archive button text based on current mailbox
          const archiveText = mailbox === 'inbox' ? 'Archive' : 'Unarchive'
          // Add button
          email_element.innerHTML += `
          <button class="archive btn btn-sm btn-outline-secondary">${archiveText}</button>`
        }

        document.querySelector('#emails-view').appendChild(email_element);

        const archiveBtn = document.querySelector('.archive');

        if (archiveBtn) {
          archiveBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent email click event from firing

            fetch(`/emails/${email.id}`, {
              method: 'PUT',
              body: JSON.stringify({
              archived: mailbox === 'inbox'
              })
            })
            .then(() => {
              // Reload the current mailbox to reflect changes
              load_mailbox('inbox');
            })
            .catch(error => {
              console.error('Error archiving email:', error);
            });
          })
        }

        // Add click event to view email details
        email_element.addEventListener('click', () => view_email(email.id));

        // Handle read emails
        if (email.read && mailbox == "inbox") {
          email_element.style.backgroundColor = "#e6e6e6"; 
        }
      });
    }
    })
    .catch(error => {
      console.error('Error loading mailbox:', error);
      document.querySelector('#emails-view').innerHTML = `<p>Error loading mailbox: ${error}</p>`;
    });
}

function view_email(email_id) {
  // Fetch email details from the API
  fetch(`/emails/${email_id}`)
    .then(response => response.json())
    .then(email => {
      // Show email details
      document.querySelector('#emails-view').innerHTML = `
        <h3>${email.subject}</h3>
        <p><strong>From:</strong> ${email.sender}</p>
        <p><strong>To:</strong> ${email.recipients.join(', ')}</p>
        <p><strong>Timestamp:</strong> ${email.timestamp}</p>
        <hr>
        <p>${email.body}</p>
        <hr>
        <button class="reply btn btn-sm btn-outline-secondary">Reply</button>
      `;

      // Add click event to compose reply
      document.querySelector('.reply').addEventListener('click', (event) => {
        compose_email(email);
      })

      // Mark email as read
      if (!email.read) {
        fetch(`/emails/${email_id}`, {
          method: 'PUT',
          body: JSON.stringify({ read: true })
        });
      }
    })
    .catch(error => {
      console.error('Error loading email:', error);
      document.querySelector('#emails-view').innerHTML = `<p>Error loading email: ${error}</p>`;
    });
}

// When back arrow is clicked, show previous section
window.onpopstate = function(event) {
  if (event.state && event.state.section) {
    const section = event.state.section;
    if (section == 'compose') {
      compose_email()
    }
    else {
      load_mailbox(section)
    }
  }
}