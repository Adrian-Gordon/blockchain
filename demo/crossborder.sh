curl -X POST \
      http://$1:$2/crossborder/c001000 \
      -H 'accept: application/json' \
      -H 'cache-control: no-cache' \
      -H 'content-type: application/json'



declare -a arr=("dummy001" "dummy002" "dummy003" "dummy004" "dummy005" "dummy006" "dummy007" "dummy008" "dummy009" "dummy010" "dummy011" "dummy012" "dummy013" "dummy014" "dummy015" )

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
done
