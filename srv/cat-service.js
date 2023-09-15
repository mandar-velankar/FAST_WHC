const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');
module.exports = (srv) => {
    const {
        Contracts,
        Discounts,
        Rebates,
        WHCProducts,
        ContractCustomers,
        DiscountProducts,
        Discounts_History,
        DiscountProducts_History,
    } = cds.entities("com.bayer.SXTENDER.whc");

    srv.on("READ", "DiscountsView", async (req) => {
        const where = req.query.SELECT.where;
        let discounts = [];
        let products;
        let contarctsViewId;
        let isCurrent;
        if (where) {
            isCurrent = where.slice(7, 11)[3].val;
            contarctsViewId = where.slice(11, 15)[3].val
            let discountFilter = where.slice(0, 7);
            if (isCurrent) {
                discounts = await SELECT.from(Discounts).where(discountFilter);
                products = await SELECT.from(DiscountProducts);
            }else {
                discounts = await SELECT.from(Discounts_History).where(discountFilter);
                products = await SELECT.from(DiscountProducts_History);
            }
        }
         
        const discountItems = [];
        discounts.map(async discount => {
            const discountProducts = products.filter(product => product.DiscountID === discount.ID);
            const mappedDiscount = {
                ContractID: discount.ContractID,
                Year: discount.Year,
                Units: discount.Units,
                DiscountID: discount.ID,
                Mirena: "",
                Kyleena: "",
                Skyla: "",
                isCurrent: isCurrent,
                ContractsViewID: contarctsViewId
            };

            discountProducts.forEach(product => {
                const productName = product.ProductName;
                mappedDiscount[productName] = product.WAC
            });

            discountItems.push(mappedDiscount);
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
 
    srv.on(["UPDATE"], "DiscountsView", async (req) => {
        const discount = await SELECT.one.from(Discounts).where({ID: req.data.DiscountID});
        const products = await SELECT.from(DiscountProducts).where({DiscountID: req.data.DiscountID});

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
        await updateMappedProducts(req, products);
        
    })

    srv.before(["UPDATE"], ["Rebates"], async (req) => {
       delete req.data.ValidFrom;
       delete req.data.ValidTo;
    })

    srv.before(["UPDATE"], ["Contracts"], async (req) => {
        (!req.data.ProposedContractLength || (req.data.ProposedContractLength < 0 || req.data.ProposedContractLength > 6)) && req.error({ code: 400, message: "Proposed Contract Length should not be greater than 6 years", target: "ProposedContractLength" });
    })
    
    srv.on(["CREATE", "UPDATE"], ["ContractsView"], async (req) => {
        const newID = uuidv4();
        const whcProducts = await SELECT.from(WHCProducts);
        let contract = await SELECT.one.from(Contracts).where({ID: req.data?.ID});

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
            if (req.data?.isCurrent) {
                await UPDATE(Contracts).with (mappedContract).where({ID: contract.ID});
                await createCascadingHistoryData(req);
            }
        }else {
            const mappedDiscountsAndRebates = await getMappedDiscountsAndRebates(newID, whcProducts);
            mappedContract.ID = newID;
            await INSERT.into(Contracts).entries(mappedContract);
            await INSERT.into(Discounts).entries(mappedDiscountsAndRebates.newDiscounts);
            await INSERT.into(Rebates).entries(mappedDiscountsAndRebates.newRebates);

            contract = await SELECT.one.from(Contracts).where({ID: newID})
            contract.ContractsViewID = `${contract.ID}-${contract.ValidTo}`;
        }
        
        return contract;
    })

    const updateMappedProducts = async function (req, products) {
        if (products.length > 0) {
            const productPromises = products.map(async product => {
                product.WAC = req.data[product.ProductName]
                delete product.ValidFrom;
                delete product.ValidTo;
                return await UPDATE(DiscountProducts).with(product).where({ID: product.ID});
            });
            return Promise.all(productPromises);
        }
    }

    const createDiscountProducts = function (discount, whcProducts) {
        const promises = whcProducts.map(async prod => {
            const mappedProduct = {
                ProductName: prod.ProductName,
                WAC: prod.WAC,
                DiscountID: discount.ID
            };
            return await INSERT.into(DiscountProducts).entries(mappedProduct);
        })
        return Promise.all(promises);
    } 

    const getMappedDiscountsAndRebates = async (contractId, whcProducts) => {
        const newDiscounts = [];
        const newRebates = []

        for (let i = 1; i <= 6; i++) {
            const discount = {
                ID: uuidv4(),
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

            await createDiscountProducts(discount, whcProducts);
        }
        return {
            newDiscounts,
            newRebates
        };
    }

    const createCascadingHistoryData = async function(req){
        const contractID = req.data?.ID;
        const discounts = await SELECT.from(Discounts).where({ContractID: contractID});
        const rebates = await SELECT.from(Rebates).where({ContractID: contractID});
        const customers = await SELECT.from(ContractCustomers).where({ContractID: contractID});
        const discountProducts = await SELECT.from(DiscountProducts);
        const filteredProducts = [];

        const discountPromises = discounts.map(async d => {
            filteredProducts.push(discountProducts.filter(p => p.DiscountID == d.ID));
            d.modifiedAt = new Date().toJSON();
            delete d.ValidFrom;
            delete d.ValidTo;
            return await UPDATE(Discounts).with(d).where({ID: d.ID});
        });
        const rebatePromises = rebates.map(async d => {
            d.modifiedAt = new Date().toJSON();
            delete d.ValidFrom;
            delete d.ValidTo;
            return await UPDATE(Rebates).with(d).where({ID: d.ID});
        });
        const customerPromises = customers.map(async d => {
            d.modifiedAt = new Date().toJSON();
            delete d.ValidFrom;
            delete d.ValidTo;
            return await UPDATE(ContractCustomers).with(d).where({ID: d.ID});
        });
        // const discountProductPromises = discountProducts.map(async d => {
        //     d.modifiedAt = new Date().toJSON();
        //     delete d.ValidFrom;
        //     delete d.ValidTo;
        //     return await UPDATE(DiscountProducts).with(d).where({ID: d.ID});
        // });

        return Promise.all(discountPromises.concat(rebatePromises).concat(customerPromises));
    }
};