"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["IN_TRANSIT"] = "IN_TRANSIT";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELED"] = "CANCELED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
