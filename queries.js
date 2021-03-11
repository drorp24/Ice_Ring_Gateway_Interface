const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ring',
  password: 'postgres',
  port: 5432,
})


const getLatestRunIds = (request, response) => {
  const amount = parseInt(request.params.amount) || 10
  pool.query(`Select * from manager_suppliers_category_status t
              ORDER by t.update_time::timestamp DESC
              LIMIT $1`,[amount],
   (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getLatestPublishedRunIds = (request, response) => {
  const amount = parseInt(request.params.amount) || 10
  pool.query(`Select * from manager_suppliers_category_status t
              where t.publish_time is not null
              ORDER by t.update_time::timestamp DESC
              LIMIT $1`,[amount],
   (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getAllRecommendations = (request, response) => {
    pool.query('SELECT * FROM public.allocation_recommendations', (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
  }

  const getAllRecommendationsByRunId = (request, response) => {
    const run_id = request.params.run_id
  
    pool.query('SELECT * FROM public.allocation_recommendations WHERE run_id = $1', [run_id], (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
  }


  const approveRecommendationsById= (request, response) => {
    const id = parseInt(request.params.id)
    const { status, reason } = request.body
  
    pool.query(
       `
        UPDATE public.allocation_recommendations
        SET status = $2
        WHERE  id = $1
       `
     ,
      [id,status],
      (error, results) => {
        if (error) {
          throw error
        }
        response.status(200).send(`Allocation Modified  modified with ID: ${id}`)
      }
    )
  }


  const getDirectivesByRunId = (request, response) => {
    const run_id = request.params.run_id
    pool.query(`
    with selected_run as (
			select * from manager_suppliers_category_status
  			where id=$1
		)   
  
    select sc.id,name,sc.update_time,data::json->'supplier_category_directives' as directives from suppliers_categories sc
           join selected_run sr on sc.next_data_version=sr.suppliers_category_version::numeric
		   where sc.id=sr.suppliers_category_id
    `
    , [run_id], (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
  }

  const getResourcesByRunId = (request, response) => {
    const run_id = request.params.run_id
    pool.query(`
    with selected_run as (
			select * from manager_suppliers_category_status
      where id=$1
		)   
  
    select fa.id,fa.start_time,fa.end_time,
    data::json->'drone_loading_dock'->'drone_type' as drone_type,
    data::json->'drone_loading_dock'->'relevant_packages' as relevant_packages,
    fa.number_of_drones_for_supplier_category,
    data
    from fleets_allocations fa, selected_run sr
           where sr.suppliers_category_id = ANY(fa.suppliers_category_ids)
           and (to_timestamp(sr.update_time,'YYYY-MM-DDTHH24:MI:SS')-INTERVAL '24' HOUR) < Date(fa.end_time)
           and (to_timestamp(sr.update_time,'YYYY-MM-DDTHH24:MI:SS')-INTERVAL '24' HOUR )< Date(fa.start_time)
           and fa.next_data_version=sr.fleet_allocation_version::numeric
		  
    `
    , [run_id], (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
  }



  const getRequestsByRunId = (request, response) => {
    const run_id = request.params.run_id
    pool.query(`
    with requests_with_location as (
      SELECT *, st_geomfromgeojson(arr->> 'geojson') as locations
    FROM public.delivery_requests dr, json_array_elements(dr.options_locations) as arr
    ),
    selected_run as (
    select * from manager_suppliers_category_status
    where id=$1
    ),
    suppliers_categories_location_directives as(
    Select sc.id,sc.next_data_version,name,sc.update_time,st_geomfromgeojson(json_array_elements(data::json->'supplier_category_directives'->'local_flight_districs')->'local_flight_district'->>'geojson') as allowed_flight_area from suppliers_categories sc
    )

    select dr.id,dr.suppliers_category_id,dr.update_time,dr.start_time,dr.end_time,dr.data,dr.score,st_asgeojson(dr.locations) as location
    from selected_run sr
    join suppliers_categories_location_directives sc
    on sc.next_data_version=sr.suppliers_category_version::numeric
    join requests_with_location dr
    on dr.suppliers_category_id =sr.suppliers_category_id and ST_Within(dr.locations, sc.allowed_flight_area)
    where ((to_timestamp(sr.update_time,'YYYY-MM-DDTHH24:MI:SS')+INTERVAL '24' HOUR) >to_timestamp(dr.end_time,'YYYY-MM-DD HH24:MI:SS'))
    and ((to_timestamp(sr.update_time,'YYYY-MM-DDTHH24:MI:SS')+INTERVAL '24' HOUR )> to_timestamp(dr.start_time,'YYYY-MM-DD HH24:MI:SS') 
    and (to_timestamp(sr.update_time,'YYYY-MM-DDTHH24:MI:SS')+INTERVAL '6' HOUR )< to_timestamp(dr.start_time,'YYYY-MM-DD HH24:MI:SS') ) 
    and dr.next_data_version<=sr.delivery_requests_version

    `
    , [run_id], (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
  }



  module.exports = {
    getLatestPublishedRunIds,
    getLatestRunIds,
    getAllRecommendations,
    getAllRecommendationsByRunId,
    approveRecommendationsById,
    getDirectivesByRunId,
    getRequestsByRunId,
    getResourcesByRunId
  }