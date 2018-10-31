declare -a arr=("c001001" "c001002" "c001003" "c001004" "c001005" "c001006" "c001007" "c001008" "c001009" "c001010" "c001011" "c001012" "c001013" "c001014" "c001015" "c001016" "c001017" "c001018" "c001019" "c001020" "c001021" "c001022" "c001023" "c001024")

for i in "${arr[@]}"; do\
    
    curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"despatched",
           "data":{
              "consignee":{
                "forename":"Seamus",
                "surname":"Caffrey",
                "address1":"10",
                "address2":"Galway Road",
                "city":"Tralee",
                "county": "Kerry",
                "postcode":"V92HKA4",
                "country": "Ireland"
              },
              "recipient":{
                "forename":"Henry",
                "surname":"Corcoran",
                "address1":"Midland Cattle Dealers",
                "address2":"Jessop Street",
                "city":"Portlaoise",
                "county":"Co. Laoise",
                "postcode":"R32 KV20",
                "country":"Ireland"

              }
            }

          }'

      curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"received",
           "data":{
              "consignee":{
                "forename":"Seamus",
                "surname":"Caffrey",
                "address1":"10",
                "address2":"Galway Road",
                "city":"Tralee",
                "county": "Kerry",
                "postcode":"V92HKA4",
                "country": "Ireland"
              },
              "recipient":{
                "forename":"Henry",
                "surname":"Corcoran",
                "address1":"Midland Cattle Dealers",
                "address2":"Jessop Street",
                "city":"Portlaoise",
                "county":"Co. Laoise",
                "postcode":"R32 KV20",
                "country":"Ireland"

              }
            }

          }'

    curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"despatched",
           "data":{
              "consignee":{
                "forename":"Henry",
                "surname":"Corcoran",
                "address1":"Midland Cattle Dealers",
                "address2":"Jessop Street",
                "city":"Portlaoise",
                "county":"Co. Laoise",
                "postcode":"R32 KV20",
                "country":"Ireland"
              },
              "recipient":{
                "forename":"Mick",
                "surname":"McManus",
                "address1":"Hilltown Farm",
                "address2":"Hilltown Road",
                "city":"Belleek",
                "county":"Co. Fermanagh",
                "postcode":"BT92 9JU",
                "country":"Northern Ireland, UK"

              }
            }

          }'

      curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"received",
           "data":{
              "consignee":{
                "forename":"Henry",
                "surname":"Corcoran",
                "address1":"Midland Cattle Dealers",
                "address2":"Jessop Street",
                "city":"Portlaoise",
                "county":"Co. Laoise",
                "postcode":"R32 KV20",
                "country":"Ireland"
              },
              "recipient":{
                "forename":"Mick",
                "surname":"McManus",
                "address1":"Hilltown Farm",
                "address2":"Hilltown Road",
                "city":"Belleek",
                "county":"Co. Fermanagh",
                "postcode":"BT92 9JU",
                "country":"Northern Ireland, UK"

              }
            }

          }'

    curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"importdeclaration",
           "data":{
              "commoditycode":"0102211000",
              "price": 1695,
              "currency":"EUR",
              "exchangerate":0.89,
              "customsvalue": 1508.55,
              "importdutyrate":0.03,
              "importdutytotal":42.26,
              "vatrate":0.2,
              "vattotal":310.16,
              "exciserate":0,
              "excisetotal":0,
              "total":1860.97,
              "chargecode":"NI00001"
            }

          }'


      curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"paymentreceived",
           "data":{
              "total":1860.97,
              "chargecode":"NI00001"
            }

          }'


     

done

declare -a arr=( "c001002" "c001003" "c001004" "c001005" "c001006" "c001007" "c001008" "c001009" "c001010" "c001011" "c001012" "c001013" "c001014" "c001015" "c001016" "c001017" "c001018" "c001019" "c001020" "c001021" "c001022" "c001023" "c001024")

for i in "${arr[@]}"; do\

      curl -X POST \
      http://$1:$2/transactions \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json' \
      -d '{"consignmentid":"'$i'",
           "datatype":"application/json",
           "transactiontype":"cvedpresented",
           "data":{
              "documenttype":"application/pdf",
              "url":"https://s3.amazonaws.com/culturehub/Blankcved.pdf",
              "checksum":"d63877ca132913f71e48c975a6ec0518"
            }

          }'

done
