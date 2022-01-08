module.exports = (error, req, res, next) => {
    const status = error.statusCode || 500;
    const state = error.state || 0;
    const message = error.message;
    const data = error.data || false;

    console.log(error);

    res.status(status).json({ state: state, message: message, data:data });
}