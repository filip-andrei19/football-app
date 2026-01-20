// Funcție care preia erorile din funcțiile async și le dă mai departe la Express
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};