const sendEmail = require('../config.js/email');


module.exports.SendEmailController = async function (req, res) {
    try {
        await sendEmail(); // No need to pass any args, all hardcoded
        console.log('Email sent successfully');
        res.status(200).json({ message: 'Email sent successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
};
