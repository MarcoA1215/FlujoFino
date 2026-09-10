"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementType = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["CANCELED"] = "CANCELED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var MovementType;
(function (MovementType) {
    MovementType["IN"] = "IN";
    MovementType["OUT"] = "OUT";
})(MovementType || (exports.MovementType = MovementType = {}));
