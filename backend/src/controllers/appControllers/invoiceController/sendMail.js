const fs = require('fs');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const { generatePdf } = require('@/controllers/pdfController');
const { loadSettings } = require('@/middlewares/settings');

const mail = async (req, res) => {
  try {
    const { id } = req.body;
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findOne({ _id: id, removed: false }).populate('client').exec();
    
    if (!invoice) {
        return res.status(404).json({ success: false, result: null, message: 'Invoice not found' });
    }
    
    // Check if Resend API key is provided, if not simulate success
    if (!process.env.RESEND_API || process.env.RESEND_API === 'your resend_api') {
        console.log(`[SIMULATION] Email sent to ${invoice.client?.email || 'unknown'} with Invoice PDF attached.`);
        
        await Invoice.findOneAndUpdate({ _id: id }, { status: 'sent' }).exec();

        return res.status(200).json({
           success: true,
           result: 'simulated',
           message: 'Email simulated successfully (Add RESEND_API to .env to send real emails)',
        });
    }

    const settings = await loadSettings();
    const resend = new Resend(process.env.RESEND_API);
    
    const sender_email = settings.company_email || 'onboarding@resend.dev';
    const pdfPath = 'src/public/download/invoice/invoice-' + invoice._id + '.pdf';
    
    await new Promise((resolve, reject) => {
      generatePdf('Invoice', { filename: 'invoice_pdf', format: 'A5', targetLocation: pdfPath }, invoice, () => {
         resolve();
      });
    });

    const fileContent = fs.readFileSync(pdfPath);
    
    const { data, error } = await resend.emails.send({
      from: sender_email,
      to: invoice.client?.email,
      subject: `Invoice # ${invoice.number}/${invoice.year} from ${settings.company_name}`,
      html: `
        <p>Dear ${invoice.client?.name},</p>
        <p>Please find attached your invoice <b># ${invoice.number}/${invoice.year}</b>.</p>
        <p>Total Amount: <b>$${invoice.total.toFixed(2)}</b></p>
        <p>Thank you for your business!</p>
        <br />
        <p>${settings.company_name}</p>
      `,
      attachments: [
        {
          filename: `Invoice_${invoice.number}_${invoice.year}.pdf`,
          content: fileContent,
        },
      ],
    });

    if (error) {
       return res.status(500).json({ success: false, result: null, message: error.message });
    }

    await Invoice.findOneAndUpdate({ _id: id }, { status: 'sent' }).exec();

    return res.status(200).json({
      success: true,
      result: data,
      message: 'Successfully sent invoice by email',
    });
  } catch (err) {
    return res.status(500).json({ success: false, result: null, message: err.message });
  }
};

module.exports = mail;
