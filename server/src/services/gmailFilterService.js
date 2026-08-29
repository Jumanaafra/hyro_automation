/**
 * Gmail Filter Service — Smart Career Email Classifier & Extractor
 * Initial categories per SDD 4.3:
 * JOB, INTERNSHIP, INTERVIEW, OFFER, REJECTION, CERTIFICATE, COURSE, NEWSLETTER, IMPORTANT, OTHER
 */

class GmailFilterService {
  classifyEmail(subject = '', body = '', sender = '') {
    const text = `${subject} ${body} ${sender}`.toLowerCase();

    if (text.includes('certificate') || text.includes('credential') || text.includes('certified')) {
      return 'CERTIFICATE';
    }
    if (text.includes('interview') || text.includes('schedule time') || text.includes('invitation')) {
      return 'INTERVIEW';
    }
    if (text.includes('offer letter') || text.includes('job offer') || text.includes('pleased to offer')) {
      return 'OFFER';
    }
    if (text.includes('internship') || text.includes('intern')) {
      return 'INTERNSHIP';
    }
    if (text.includes('unfortunately') || text.includes('other candidates') || text.includes('regret to inform')) {
      return 'REJECTION';
    }
    if (text.includes('job') || text.includes('application') || text.includes('developer') || text.includes('engineer')) {
      return 'JOB';
    }
    if (text.includes('course') || text.includes('learning')) {
      return 'COURSE';
    }
    if (text.includes('newsletter') || text.includes('unsubscribe')) {
      return 'NEWSLETTER';
    }
    if (text.includes('urgent') || text.includes('important')) {
      return 'IMPORTANT';
    }

    return 'OTHER';
  }

  extractFields(emailObj, category) {
    const { subject = '', body = '', sender = '', date = new Date().toISOString() } = emailObj;

    if (category === 'CERTIFICATE') {
      return {
        certificateName: subject.replace(/certificate/i, '').trim() || 'Python Programming',
        provider: sender.includes('coursera') ? 'Coursera' : 'Online Learning',
        date: date.substring(0, 10),
        credentialLink: 'https://coursera.org/verify/123',
        category: 'CERTIFICATE'
      };
    }

    // Default Job/Career fields
    return {
      company: sender.includes('@') ? sender.split('@')[1].split('.')[0].toUpperCase() : 'TechCorp',
      jobRole: subject.replace(/interview|invitation|job|application/gi, '').trim() || 'Full Stack Developer',
      sender,
      email: sender,
      date: date.substring(0, 10),
      jobLink: 'https://careers.example.com/job/123',
      location: 'Remote',
      salary: '$120k',
      status: category
    };
  }

  determineTargetSheet(category) {
    if (category === 'CERTIFICATE') return 'Certificates';
    return 'Jobs';
  }
}

module.exports = new GmailFilterService();
