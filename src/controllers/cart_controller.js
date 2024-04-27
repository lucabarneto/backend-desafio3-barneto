const CartService = require("../services/cart_service.js"),
  ProductService = require("../services/product_service.js"),
  TicketService = require("../services/ticket.service.js");

const cartService = new CartService(),
  productService = new ProductService(),
  ticketService = new TicketService();

class CartController {
  //handlePid y handleCid se emplean sobre el método param del router. Muchas funciones necesitan de una ejecución previa de handlePid y handleCid para funcionar correctamente
  handlePid = async (req, res, next, pid) => {
    const product = await productService.getProductById(pid);

    if (!product.status) {
      req.product = null;
    } else {
      req.product = product.payload;
    }

    next();
  };

  handleCid = async (req, res, next, cid) => {
    const cart = await cartService.getCartById(cid);

    if (!cart.status) {
      req.cart = null;
    } else {
      req.cart = cart.payload;
      req.cid = cid;
    }

    next();
  };

  createCart = async (req, res) => {
    try {
      const cart = await cartService.addCart(req.body);

      if (cart.status) {
        return res.sendCreatedSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  getProducts = async (req, res) => {
    try {
      return req.cart
        ? res.sendSuccess(req.cart.products)
        : res.sendNotFoundError("Cart not found");
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  addProductToCart = async (req, res) => {
    try {
      if (!req.cart) {
        return res.sendNotFoundError("Cart not found");
      }

      if (!req.product) {
        return res.sendNotFoundError("Product not found");
      }

      const cart = await cartService.addProductToCart(
        req.cart,
        req.product,
        req.body.quantity
      );

      if (cart.status) {
        return res.sendCreatedSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  deleteAllProducts = async (req, res) => {
    try {
      if (!req.cart) {
        return res.sendNotFoundError("Cart not found");
      }

      const cart = await cartService.deleteAllProducts(req.cart);

      if (cart.status) {
        return res.sendSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  deleteProduct = async (req, res) => {
    try {
      if (!req.cart) {
        return res.sendNotFoundError("Cart not found");
      }

      if (!req.product) {
        return res.sendNotFoundError("Product not found");
      }

      const cart = await cartService.deleteProduct(req.cart, req.product);

      if (cart.status) {
        return res.sendSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  updateProduct = async (req, res) => {
    try {
      if (!req.cart) {
        return res.sendNotFoundError("Cart not found");
      }

      if (!req.product) {
        return res.sendNotFoundError("Product not found");
      }

      const cart = await cartService.updateProductQuantity(
        req.cart,
        req.product,
        req.body.quantity
      );

      if (cart.status) {
        return res.sendCreatedSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  InsertProducts = async (req, res) => {
    try {
      const cart = await cartService.updateCart(req.cart, req.body);

      if (cart.status) {
        return res.sendCreatedSuccess(cart.payload);
      } else {
        return res.sendUserError(cart.error);
      }
    } catch (err) {
      return res.sendServerError(err.message ? err.message : err);
    }
  };

  purchase = async (req, res) => {
    const cart = await cartService.getCart(req.cart);

    let amount = 0,
      unprocessed = [];

    cart.payload.products.forEach(async (pref) => {
      const product = await productService.getProductById(pref.product._id);

      if (product.stock >= pref.quantity) {
        amount += product.price * pref.quantity;

        await productService.updateProduct(product, {
          $set: { stock: stock - pref.quantity },
        });
      } else {
        unprocessed.push(pref);
      }
    });

    if (amount === 0) {
      return res.sendServerError("No products were processed");
    }

    let code = Math.round(Math.random() * 10000).toString();

    const ticketData = {
      code,
      purchase_datetime: Date.now(),
      amount,
      purchaser: req.user.email,
    };

    const ticket = await ticketService.createTicket(ticketData);

    await cartService.deleteAllProducts(cart);
    await cartService.updateCart(cart, unprocessed);

    return res.sendSuccess(ticket);
  };
}

module.exports = CartController;
