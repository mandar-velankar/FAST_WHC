const cds = require('@sap/cds');
module.exports = (srv) => {
    const {
        Discounts,
        WHCProducts
    } = cds.entities("com.bayer.SXTENDER.whc");

    srv.on("READ", "DiscountTableView", async (req) => {
        const where = req.query.SELECT.where;
        let discounts;
        if (where) {
            discounts = await SELECT.from(Discounts).where(where);
        }else {
            discounts = await SELECT.from(Discounts);
        }
        
        const products = await SELECT.from(WHCProducts);

        const discountItems = discounts.map(discount => {
            const discountProducts = products.filter(product => product.Discount_ID === discount.ID);

            const obj = {
                ContractsID: discount.Contracts_ID,
                Year: discount.Year,
                Units: discount.Units,
                DiscountID: discount.ID,
                Myrena: "",
                Kyleena: "",
                Skyla: ""
            };

            discountProducts.forEach(product => {
                const productName = product.ProductName;
                obj[productName] = product.WAC
            })
            return obj;
        });
        return discountItems;
    });
};