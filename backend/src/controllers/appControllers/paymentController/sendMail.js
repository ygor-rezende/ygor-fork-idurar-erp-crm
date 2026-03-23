const fs = require('fs');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const { generatePdf } = require('@/controllers/pdfController');
const { loadSettings } = require('@/middlewares/settings');

const mail = async (req, res) => {
  try {
    const { id } = req.body;
    const Payment = mongoose.model('Payment');
    const payment = await Payment.findOne({ _id: id, removed: false }).populate('client').exec();
    
    if (!payment) {
        return res.status(404).json({ success: false, result: null, message: 'Payment not found' });
    }
    
    if (!process.env.RESEND_API || process.env.RESEND_API === 'your resend_api') {
        console.log(`[SIMULATION] Email sent to ${payment.client?.email || 'unknown'} with Payment PDF attached.`);
        return res.status(200).json({
           success: true,
           result: 'simulated',
           message: 'Email simulated successfully (Add RESEND_API to .env to send real emails)',
        });
    }

    const settings = await loadSettings();
    const resend = new Resend(process.env.RESEND_API);
    
    const sender_email = settings.company_email || 'onboarding@resend.dev';
    const pdfPath = 'src/public/download/payment/payment-' + payment._id + '.pdf';
    
    await new Promise((resolve, reject) => {
      generatePdf('Payment', { filename: 'payment_pdf', format: 'A5', targetLocation: pdfPath }, payment, () => {
         resolve();
      });
    });

    const fileContent = fs.readFileSync(pdfPath);
    
    const { data, error } = await resend.emails.send({
      from: sender_email,
      to: payment.client?.email,
      subject: `Payment Receipt # ${payment.number}/${payment.year} from ${settings.company_name}`,
      html: `
        <p>Dear ${payment.client?.name},</p>
        <p>Please find attached your payment receipt <b># ${payment.number}/${payment.year}</b>.</p>
        <p>Thank you for your business!</p>
        <br />
        <p>${settings.company_name}</p>
      `,
      attachments: [
        {
          filename: `Payment_${payment.number}_${payment.year}.pdf`,
          content: fileContent,
        },
      ],
    });

    if (error) {
       return res.status(500).json({ success: false, result: null, message: error.message });
    }

    return res.status(200).json({
      success: true,
      result: data,
      message: 'Successfully sent payment receipt by email',
    });
  } catch (err) {
    return res.status(500).json({ success: false, result: null, message: err.message });
  }
};

module.exports = mail;
