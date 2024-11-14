import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  ListGroup,
  ListGroupItem,
  Button,
  Image,
  Alert,
} from "react-bootstrap";
import { useSelector } from "react-redux";
import CheckoutSteps from "../components/CheckoutSteps";
import { Link, useLocation } from "react-router-dom";
import { CreatePayment } from "../network/endpoints/Order";

export const PaymentTargetScreen = () => {
  const location = useLocation();
  const { element } = location.state || {};
  console.log(element);

  const [errorMessage, setErrorMessage] = useState(null);
  const { userInfo } = useSelector((state) => state.user);
  const { shippingAddress } = useSelector((state) => state.cart);
  const { paymentMethod } = useSelector((state) => state.cart);
  const { error, success, order } = useSelector((state) => state.order);

  const cart = useSelector((state) => state.cart);
  const { cartItems } = useSelector((state) => state.cart);
  const { serverUrl } = useSelector((state) => state.app);

  // Calcula el precio total sumando los precios de cada artículo multiplicado por la cantidad
  const totalPrice = order?.orderItems?.reduce(
    (acc, item) => acc + Number(item.qty) * Number(item.price),
    0
  );

  const handlePayment = async () => {
    try {
      console.log(order._id, totalPrice);
      const response = await CreatePayment(userInfo.token, order._id, totalPrice * 100); // Multiplícalo por 100 para obtener el valor en centavos
      const { url, Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } = response.data;

      console.log(url, Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature);

      if (url && Ds_SignatureVersion && Ds_MerchantParameters && Ds_Signature) {
        // Crear el formulario dinámicamente
        const form = document.createElement("form");
        form.method = "POST";
        form.action = url;

        // Añadir campos ocultos con los datos específicos de Redsys
        form.innerHTML = `
          <input type="hidden" name="Ds_SignatureVersion" value="${Ds_SignatureVersion}" />
          <input type="hidden" name="Ds_MerchantParameters" value="${Ds_MerchantParameters}" />
          <input type="hidden" name="Ds_Signature" value="${Ds_Signature}" />
        `;

        // Añadir el formulario al DOM y enviarlo
        document.body.appendChild(form);
        form.submit();
      } else {
        setErrorMessage("No se pudo iniciar el pago. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Error iniciando el pago:", err);
      setErrorMessage("Error iniciando el pago. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div className="">
      <CheckoutSteps step1 step2 step3 step4 />
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
      <Row>
        <Col md>
          <Card className="px-3 py-5 my-3">
            <Form.Label>Email</Form.Label>
            <Form.Control disabled type="email" placeholder={userInfo.email} />
          </Card>
          <Card className="px-3 py-5 my-3">
            <Row>
              <Col xs>
                <Form.Label>Address</Form.Label>
                <Form.Control disabled type="text" placeholder={shippingAddress.address} />
              </Col>
              <Col xs>
                <Form.Label>Postal</Form.Label>
                <Form.Control disabled type="text" placeholder={shippingAddress.postalCode} />
              </Col>
            </Row>
            <Row className="my-5">
              <Col xs>
                <Form.Label>City</Form.Label>
                <Form.Control disabled type="text" placeholder={shippingAddress.city} />
              </Col>
              <Col xs>
                <Form.Label>Country</Form.Label>
                <Form.Control disabled type="text" placeholder={shippingAddress.country} />
              </Col>
            </Row>
          </Card>
          <Card className="px-3 py-5 my-3">
            <Form.Label>Payment Method</Form.Label>
            <Form.Control disabled type="text" placeholder={paymentMethod} />
          </Card>
        </Col>
        <Col md>
          <Card className="px-3 py-5 my-3">
            <h5>Order Items</h5>
            {order?.orderItems?.map((item) => (
              <ListGroupItem key={item.name} className="my-3">
                <Row>
                  <Col md={2}>
                    <Image src={serverUrl + item.image} alt={item.name} fluid rounded />
                  </Col>
                  <Col md={3} className="d-flex align-items-center">
                    <Link to={`/product/${item.product}`}>{item.name}</Link>
                  </Col>
                  <Col md={2} className="d-flex align-items-center">
                    {item.price}€
                  </Col>
                  <Col md={3} className="d-flex align-items-center">
                    <Form.Control disabled as="select" value={item.qty}>
                      {[...Array(item.countInStock).keys()].map((x) => (
                        <option key={x + 1} value={x + 1}>
                          {x + 1}
                        </option>
                      ))}
                    </Form.Control>
                  </Col>
                </Row>
              </ListGroupItem>
            ))}
          </Card>
          <Card className="rounded my-3">
            <ListGroup variant="flush">
              <ListGroupItem>
                <h4 className="my-5">
                  Order Info <i className="fa-solid fa-circle-info"></i>
                </h4>
                <Row>
                  <Col>
                    <p className="sub-text">Items:</p>
                  </Col>
                  <Col>
                    <p className="sub-text">
                      {order?.orderItems?.reduce((acc, item) => acc + Number(item.qty), 0)}
                    </p>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <p className="sub-text">Total Price:</p>
                  </Col>
                  <Col>
                    <p className="sub-text">{totalPrice?.toFixed(2)}€</p>
                  </Col>
                </Row>
              </ListGroupItem>
              <ListGroupItem>
                <Button className="w-100" variant="primary" onClick={handlePayment}>
                  Realizar Pago
                </Button>
              </ListGroupItem>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PaymentTargetScreen;
