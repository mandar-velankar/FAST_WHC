const cds = require('@sap/cds');
module.exports = (srv) => {
    const {
        Contracts,
        Discounts,
        Rebates,
        WHCProducts
    } = cds.entities("com.bayer.SXTENDER.whc");

    srv.on("READ", "DiscountTableView", async (req) => {
        const where = req.query.SELECT.where;
        let discounts;
        let contractId;
        if (where) {
            contractId = where[2].val;
            discounts = await SELECT.from(Discounts).where(where);
        }else {
            discounts = await SELECT.from(Discounts);
        }
        const contract = await SELECT.one.from(Contracts).where({ID: contractId});
        const products = await SELECT.from(WHCProducts);

        const discountItems = [];
        const proposedContractLength = contract?.ProposedContractLength;
        if (!proposedContractLength) return discountItems;

        for (let i = 0; i < proposedContractLength; i++) {
            const obj = {
                Contracts_ID: contractId,
                Year: "",
                Units: "",
                DiscountID: "",
                Mirena: "",
                Kyleena: "",
                Skyla: ""
            };

            discountItems.push(obj);
        }

        if (discounts.length < 1) return discountItems;

        for (let i = 0; i < proposedContractLength; i++) {
            const discountProducts = products.filter(product => product.Discount_ID === discounts[i]?.ID);
            if (discounts[i]) {
                discountItems[i].DiscountID = discounts[i]?.ID
                discountItems[i].Year = discounts[i]?.Year
                discountItems[i].Units = discounts[i]?.Units

                discountProducts.forEach(product => {
                    const productName = product.ProductName;
                    discountItems[i][productName] = product.WAC
                })
            }else {
                discountItems[i].Year = discountItems[i - 1].Year + 1
            }
            
        }
        return discountItems;
    });

    srv.on("READ", "Rebates", async (req) => {
        const where = req.query.SELECT.where;
        let rebates;
        let contractId;
        if (where) {
            contractId = where[2].val;
            rebates = await SELECT.from(Rebates).where(where);
        }else {
            rebates = await SELECT.from(Rebates);
        }
        const contract = await SELECT.one.from(Contracts).where({ID: contractId});

        const rebateItems = [];
        const proposedContractLength = contract?.ProposedContractLength;
        if (!proposedContractLength) return rebateItems;

        for (let i = 0; i < proposedContractLength; i++) {
            const obj = {
                Contracts_ID: contractId,
                Year: "",
                Level: "",
                RebateLevels_Unit_Level_1: null,
                RebateLevels_Discount_Level_1: null,
                RebateLevels_Unit_Level_2: null,
                RebateLevels_Discount_Level_2: null,
                RebateLevels_Unit_Level_3: null,
                RebateLevels_Discount_Level_3: null
            };

            rebateItems.push(obj);
        }

        if (rebates.length < 1) return rebateItems;

        for (let i = 0; i < proposedContractLength; i++) {
            if (rebates[i]) {
                rebateItems[i].DiscountID = rebates[i]?.ID
                rebateItems[i].Year = rebates[i]?.Year
                rebateItems[i].Level = rebates[i]?.Level,
                rebateItems[i].RebateLevels_Unit_Level_1 = rebates[i]?.RebateLevels_Unit_Level_1,
                rebateItems[i].RebateLevels_Discount_Level_1 = rebates[i]?.RebateLevels_Discount_Level_1,
                rebateItems[i].RebateLevels_Unit_Level_2 = rebates[i]?.RebateLevels_Unit_Level_2,
                rebateItems[i].RebateLevels_Discount_Level_2 = rebates[i]?.RebateLevels_Discount_Level_2,
                rebateItems[i].RebateLevels_Unit_Level_3 = rebates[i]?.RebateLevels_Unit_Level_3,
                rebateItems[i].RebateLevels_Discount_Level_3 = rebates[i]?.RebateLevels_Discount_Level_3
            }else {
                rebateItems[i].Year = rebateItems[i - 1].Year + 1
            }
            
        }
        return rebateItems;
    });
};