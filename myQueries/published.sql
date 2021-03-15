Select * from manager_suppliers_category_status t
              where t.publish_time is not null
              ORDER by t.update_time::timestamp DESC
              LIMIT 10