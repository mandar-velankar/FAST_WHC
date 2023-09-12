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
        if (where) {
            discounts = await SELECT.from(Discounts).where(where);
        }else {
            discounts = await SELECT.from(Discounts);
        }
        const products = await SELECT.from(WHCProducts);

        const discountItems = discounts.map(discount => {
            const discountProducts = products.filter(product => product.Discount_ID === discount.ID);

            const obj = {
                Contracts_ID: discount.Contracts_ID,
                Year: discount.Year,
                Units: discount.Units,
                DiscountID: discount.ID,
                Mirena: "",
                Kyleena: "",
                Skyla: ""
            };
            discountProducts.forEach(product => {
                const productName = product.ProductName;
                obj[productName] = product.WAC
            })
            return obj;
        });
        const sortedDiscountItems = discountItems.sort((a, b) => {
            if (a.Year < b.Year) {
                return -1;
            }
            if (a.Year > b.Year) {
                return 1;
            }
            return 0;
        });
        return sortedDiscountItems;
    });

    srv.on(["UPDATE"], "DiscountTableView", async (req) => {
        const discount = await SELECT.one.from(Discounts).where({ID: req.data.DiscountID});
        const products = await SELECT.from(WHCProducts).where({Discount_ID: req.data.DiscountID});
        const productNames = ["Mirena", "Kyleena", "Skyla"];

        const mappedDiscount = {
            ID: req.data.DiscountID,
            Units: req.data.Units,
            Discount: req.data.Discount,
            ProductID: req.data.ProductID
        }


        if (discount) {
            await UPDATE(Discounts)
                .with (mappedDiscount)
                .where({
                    ID: req.data.DiscountID
                })
        }

        if (products.length < 1) {
            const newProducts = productNames.map(name => {
                const product = {
                    ProductName: name,
                    WAC: req.data[name],
                    Discount_ID: req.data.DiscountID,
                    Discount_Year: req.data.Year
                }
                return product;
            })
            await INSERT.into(WHCProducts).entries(newProducts);
        }else {
            const updateProducts = products.map(product => {
                const obj = {
                    ProductName: product.ProductName,
                    WAC: req.data[product.ProductName]
                }
                return obj;
            }) 

            for (let prod of updateProducts) {
                await UPDATE(WHCProducts).with(prod).where({Discount_ID: req.data.DiscountID, ProductName: prod.ProductName});
            }
        }
    })

    srv.before(["UPDATE"], ["Contracts"], async (req) => {
        (!req.data.ProposedContractLength || (req.data.ProposedContractLength < 0 || req.data.ProposedContractLength > 6)) && req.error({ code: 400, message: "Proposed Contract Length should not be greater than 6 years", target: "ProposedContractLength" });
    })
    
    srv.on(["CREATE", "UPDATE"], ["ContractFormView", "Contracts"], async (req) => {
        const contract = await SELECT.one.from(Contracts).where({ID: req.data?.ID});

        const mappedContract = {
            BackgroundInfo: req.data.BackgroundInfo,
            BaseLineDiscount: req.data.BaseLineDiscount,
            BaseLineUnits: req.data.BaseLineUnits,
            ID: req.data?.ID,
            Name: req.data.Name,
            ProposedContractLength: req.data.ProposedContractLength,
            Remarks: req.data.Remarks,
            StatusID: req.data.StatusID,
            TypeID: req.data.TypeID,
            VistexID: req.data.VistexID
        }
        if (contract) {
            await UPDATE(Contracts)
				.with (mappedContract)
				.where({
					ID: contract.ID
				})
        }else {
            const mappedDiscountsAndRebates = getMappedDiscountsAndRebates(req.data?.ID);

            await INSERT.into(Contracts).entries(mappedContract);
            await INSERT.into(Discounts).entries(mappedDiscountsAndRebates.newDiscounts);
            await INSERT.into(Rebates).entries(mappedDiscountsAndRebates.newRebates);
        }
        return req.data;
    })

    const getMappedDiscountsAndRebates = (contractId) => {
        const newDiscounts = [];
        const newRebates = []

        for (let i = 1; i <= 6; i++) {
            const discount = {
                ContractID: contractId,
                Year: i,
                Type: 2,
                Units: 0
            }
            newDiscounts.push(discount);

            const rebate = {
                ContractID: contractId,
                Year: i,
                Level: 1,
                Unit: "",
                RebateLevels_Unit_Level_1: null,
                RebateLevels_Discount_Level_1: null,
                RebateLevels_Unit_Level_2: null,
                RebateLevels_Discount_Level_2: null,
                RebateLevels_Unit_Level_3: null,
                RebateLevels_Discount_Level_3: null
            }
            newRebates.push(rebate);
        }
        return {
            newDiscounts,
            newRebates
        };
    }
};