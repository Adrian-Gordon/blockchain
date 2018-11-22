curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"c001000",
           "datatype":"application/json",
           "transactiontype":"waybill",
           "data":{
              "inventory":[
                "c001001","c001002","c001003","c001004","c001005","c001006","c001007","c001008","c001009","c001010","c001011","c001012","c001013","c001014","c001015","c001016","c001017","c001018","c001019","c001020","c001021","c001022","c001023","c001024"
              ]
            }

          }'